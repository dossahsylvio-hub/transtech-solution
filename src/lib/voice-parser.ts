/**
 * Voice command NLP parser for Bor-Bi
 * Parses transcribed text to extract action, products, quantities, and client
 */

interface VendorProduct {
  id: string;
  name: string;
  price: number;
}

interface ClientRef {
  id: string;
  name: string;
}

interface ParsedProduct {
  name: string;
  quantity: number;
  matchedProduct?: VendorProduct;
  confidence: number;
}

interface ParseResult {
  action: 'sale' | 'stock';
  products: ParsedProduct[];
  clientName?: string;
  rawText: string;
  confidence: number;
}

/**
 * Normalize text for matching: lowercase, remove accents, trim
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Simple fuzzy match: check if needle is contained in haystack (normalized)
 */
function fuzzyMatch(needle: string, haystack: string): boolean {
  const n = normalize(needle);
  const h = normalize(haystack);
  if (n.length < 2) return false;
  return h.includes(n) || n.includes(h);
}

/**
 * Extract quantity-product pairs from text
 * Patterns: "2 pains", "1 litre d'huile", "3 kg de riz", "un pain"
 */
function extractProductMentions(text: string): Array<{ name: string; quantity: number }> {
  const mentions: Array<{ name: string; quantity: number }> = [];
  const normalized = normalize(text);

  // Number words mapping
  const numberWords: Record<string, number> = {
    un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5,
    six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
    benn: 1, naar: 2, nett: 3, neent: 4, juroom: 5, // Wolof
  };

  // Pattern: [number] [unit?] [de/d'] [product]
  const patterns = [
    /(\d+)\s+(?:kilos?\s+(?:de\s+)?|litres?\s+(?:de\s+)?|(?:kg|l)\s+(?:de\s+)?)?(\w+)/g,
    /(\d+)\s+(\w+)/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(normalized)) !== null) {
      const qty = parseInt(match[1], 10);
      const name = match[2];
      if (qty > 0 && name.length >= 2 && !['et', 'de', 'du', 'la', 'le', 'au', 'a', 'ci'].includes(name)) {
        // Avoid duplicates
        if (!mentions.some((m) => m.name === name)) {
          mentions.push({ name, quantity: qty });
        }
      }
    }
  }

  // Check for word-based numbers: "un pain", "deux huiles"
  for (const [word, num] of Object.entries(numberWords)) {
    const wordPattern = new RegExp(`${word}\\s+(?:kilos?\\s+(?:de\\s+)?|litres?\\s+(?:de\\s+)?)?([a-z]+)`, 'g');
    let match;
    while ((match = wordPattern.exec(normalized)) !== null) {
      const name = match[1];
      if (name.length >= 2 && !['et', 'de', 'du', 'la', 'le'].includes(name)) {
        if (!mentions.some((m) => m.name === name)) {
          mentions.push({ name, quantity: num });
        }
      }
    }
  }

  return mentions;
}

/**
 * Parse a voice command text to extract structured sale/stock data
 */
export function parseVoiceCommand(
  text: string,
  vendorProducts: VendorProduct[],
  clients: ClientRef[]
): ParseResult {
  if (!text || text.trim().length === 0) {
    return {
      action: 'sale',
      products: [],
      rawText: text,
      confidence: 0,
    };
  }

  const normalized = normalize(text);

  // Detect action
  const stockKeywords = ['stock', 'au stock', 'ajout stock', 'rajoute', 'reapprovisionnement', 'restock', 'inventaire'];
  const saleKeywords = ['vente', 'vend', 'vendu', 'pour', 'client'];
  
  let action: 'sale' | 'stock' = 'sale';
  const isStock = stockKeywords.some((kw) => normalized.includes(normalize(kw)));
  const isSale = saleKeywords.some((kw) => normalized.includes(normalize(kw)));
  
  if (isStock && !isSale) {
    action = 'stock';
  }

  // Extract product mentions
  const mentions = extractProductMentions(text);

  // Match mentions to vendor products
  const matchedProducts: ParsedProduct[] = mentions.map((mention) => {
    let bestMatch: VendorProduct | undefined;
    let bestConfidence = 0;

    for (const product of vendorProducts) {
      if (fuzzyMatch(mention.name, product.name)) {
        const confidence = normalize(mention.name).length / normalize(product.name).length;
        if (confidence > bestConfidence) {
          bestMatch = product;
          bestConfidence = Math.min(confidence, 1);
        }
      }
    }

    return {
      name: mention.name,
      quantity: mention.quantity,
      matchedProduct: bestMatch,
      confidence: bestMatch ? Math.max(0.3, bestConfidence) : 0.1,
    };
  });

  // Detect client name
  let clientName: string | undefined;
  
  // Pattern: "à [name]", "pour [name]", "de [name]", "client [name]"
  const clientPatterns = [
    /(?:a|à|pour|chez|client)\s+([A-ZÀ-Ÿ][a-zà-ÿ]+)/,
    /(?:a|à|pour|chez|client)\s+(\w+)\s*$/i,
  ];

  for (const pattern of clientPatterns) {
    const match = text.match(pattern);
    if (match) {
      const candidateName = match[1];
      // Check if this matches a known client
      const matchedClient = clients.find((c) => fuzzyMatch(candidateName, c.name));
      if (matchedClient) {
        clientName = matchedClient.name;
        break;
      } else if (candidateName.length >= 3) {
        clientName = candidateName;
        break;
      }
    }
  }

  // Calculate overall confidence
  const productConfidence = matchedProducts.length > 0
    ? matchedProducts.reduce((sum, p) => sum + p.confidence, 0) / matchedProducts.length
    : 0;
  const clientConfidence = clientName ? 0.8 : 0;
  const overallConfidence = matchedProducts.length > 0
    ? (productConfidence * 0.7 + clientConfidence * 0.3)
    : 0;

  return {
    action,
    products: matchedProducts,
    clientName,
    rawText: text,
    confidence: Math.round(overallConfidence * 100) / 100,
  };
}
