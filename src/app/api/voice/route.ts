import { NextRequest } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse, unauthorizedResponse } from "@/lib/api-helpers";

// Voice AI: transcribe audio and parse intent
export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return unauthorizedResponse();

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const textInput = formData.get("text") as string | null;

    let transcribedText = textInput || "";

    // If audio file provided, use OpenAI Whisper
    if (audioFile && !textInput) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return errorResponse("Voice AI not configured (missing OPENAI_API_KEY)");
      }

      const whisperForm = new FormData();
      whisperForm.append("file", audioFile);
      whisperForm.append("model", "whisper-1");
      whisperForm.append("language", "fr");

      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: whisperForm,
      });

      if (!response.ok) {
        return errorResponse("Failed to transcribe audio");
      }

      const data = await response.json();
      transcribedText = data.text || "";
    }

    if (!transcribedText) {
      return errorResponse("No audio or text provided");
    }

    // Get vendor's products and clients for matching
    let products: Array<{ id: string; name: string; type: string; price: number }> = [];
    let clients: Array<{ id: string; name: string }> = [];

    if (user.role === "VENDOR") {
      const vendor = await prisma.vendor.findUnique({ where: { userId: user.userId } });
      if (vendor) {
        const vendorProducts = await prisma.vendorProduct.findMany({
          where: { vendorId: vendor.id },
        });

        for (const vp of vendorProducts) {
          if (vp.productType === "DefaultProduct") {
            const p = await prisma.defaultProduct.findUnique({ where: { id: vp.productId } });
            if (p) products.push({ id: vp.productId, name: p.nameFr, type: "DefaultProduct", price: vp.price });
          } else {
            const p = await prisma.customProduct.findUnique({ where: { id: vp.productId } });
            if (p) products.push({ id: vp.productId, name: p.name, type: "CustomProduct", price: vp.price });
          }
        }

        const vendorClients = await prisma.client.findMany({
          where: { vendorId: vendor.id },
        });
        clients = vendorClients.map((c) => ({ id: c.id, name: c.name }));
      }
    }

    // Parse the transcribed text using NLP (regex + fuzzy matching)
    const result = parseVoiceCommand(transcribedText, products, clients);

    return jsonResponse({
      transcription: transcribedText,
      parsed: result,
    });
  } catch (error) {
    console.error("Voice AI error:", error);
    return errorResponse("Internal server error", 500);
  }
}

interface ProductMatch {
  id: string;
  name: string;
  type: string;
  price: number;
}

interface ClientMatch {
  id: string;
  name: string;
}

function parseVoiceCommand(
  text: string,
  products: ProductMatch[],
  clients: ClientMatch[]
) {
  const lower = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Determine action
  let action: "sale" | "stock" = "sale";
  if (lower.includes("stock") || lower.includes("ajoute au stock") || lower.includes("réapprovisionner")) {
    action = "stock";
  }

  // Extract quantities and product names
  const quantityPatterns = [
    /(\d+)\s+(kg|kilos?|litres?|unites?|paquets?|cartons?|bouteilles?|sacs?)?\s*(?:de\s+)?([a-zéèêëàâäùûüôöïî\s'-]+)/gi,
    /(\d+)\s+([a-zéèêëàâäùûüôöïî\s'-]+)/gi,
  ];

  const matchedProducts: Array<{ name: string; quantity: number; matched: boolean; productId?: string; productType?: string; unitPrice?: number }> = [];

  for (const pattern of quantityPatterns) {
    let match;
    while ((match = pattern.exec(lower)) !== null) {
      const quantity = parseInt(match[1]);
      const productName = match[match.length - 1].trim();

      if (productName.length < 2) continue;

      // Try to match with vendor's products
      const bestMatch = findBestProductMatch(productName, products);

      matchedProducts.push({
        name: bestMatch ? bestMatch.name : productName,
        quantity,
        matched: !!bestMatch,
        productId: bestMatch?.id,
        productType: bestMatch?.type,
        unitPrice: bestMatch?.price,
      });
    }
    if (matchedProducts.length > 0) break;
  }

  // Extract client name
  let matchedClient: { id: string; name: string } | null = null;
  const clientPatterns = [
    /(?:pour|a|à|chez|client)\s+([a-zéèêëàâäùûüôöïî]+)/i,
  ];

  for (const pattern of clientPatterns) {
    const match = pattern.exec(lower);
    if (match) {
      const clientName = match[1].trim();
      matchedClient = findBestClientMatch(clientName, clients);
    }
  }

  return {
    action,
    products: matchedProducts,
    client: matchedClient,
    confidence: matchedProducts.length > 0 ? 0.8 : 0.3,
  };
}

function findBestProductMatch(query: string, products: ProductMatch[]): ProductMatch | null {
  const normalizedQuery = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  let bestMatch: ProductMatch | null = null;
  let bestScore = 0;

  for (const product of products) {
    const normalizedName = product.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (normalizedName === normalizedQuery) return product;

    if (normalizedName.includes(normalizedQuery) || normalizedQuery.includes(normalizedName)) {
      const score = normalizedQuery.length / normalizedName.length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = product;
      }
    }
  }

  return bestScore > 0.3 ? bestMatch : null;
}

function findBestClientMatch(query: string, clients: ClientMatch[]): ClientMatch | null {
  const normalizedQuery = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  for (const client of clients) {
    const normalizedName = client.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (normalizedName === normalizedQuery || normalizedName.includes(normalizedQuery) || normalizedQuery.includes(normalizedName)) {
      return client;
    }
  }

  return null;
}
