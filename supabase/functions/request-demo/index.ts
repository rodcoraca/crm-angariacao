import { createClient } from "npm:@supabase/supabase-js";
import { NotificationService } from "../_shared/notifications/NotificationService.ts";
import { buildDemoRequestCustomerNotification } from "../_shared/notifications/templates/demoRequestCustomer.ts";
import { buildDemoRequestNotification } from "../_shared/notifications/templates/demoRequest.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

type DemoRequestPayload = {
  nome: string;
  empresa: string;
  telefone: string;
  email: string;
  numero_consultores: number;
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeEmail(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function validatePayload(body: Record<string, unknown>) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^(?:\+351)?\s?9\d{8}$/;
  const telefone = normalizeText(body.telefone);
  const normalizedPhone = telefone.replace(/\s/g, "");
  const numeroConsultores = Number(body.numero_consultores);

  const payload: DemoRequestPayload = {
    nome: normalizeText(body.nome),
    empresa: normalizeText(body.empresa),
    telefone,
    email: normalizeEmail(body.email),
    numero_consultores: numeroConsultores
  };

  if (!payload.nome) return { payload, error: "nome_obrigatorio" };
  if (!payload.empresa) return { payload, error: "empresa_obrigatoria" };
  if (!phoneRegex.test(normalizedPhone)) return { payload, error: "telefone_invalido" };
  if (!emailRegex.test(payload.email)) return { payload, error: "email_invalido" };
  if (!Number.isInteger(numeroConsultores) || numeroConsultores < 1 || numeroConsultores > 9999) {
    return { payload, error: "numero_consultores_invalido" };
  }

  return { payload, error: "" };
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, {
      success: false,
      error: "method_not_allowed",
      message: "Método não suportado."
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(500, {
        success: false,
        error: "missing_runtime_secrets",
        message: "Configuração de gravação indisponível."
      });
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const { payload, error } = validatePayload(body);

    if (error) {
      return jsonResponse(400, {
        success: false,
        error,
        message: "Dados inválidos. Confirme os campos do formulário."
      });
    }

    const adminClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const createdAt = new Date().toISOString();
    const { data: requestRow, error: insertError } = await adminClient
      .from("demo_requests")
      .insert([{
        nome: payload.nome,
        empresa: payload.empresa,
        telefone: payload.telefone,
        email: payload.email,
        numero_consultores: payload.numero_consultores,
        created_at: createdAt,
        status: "novo"
      }])
      .select("id")
      .maybeSingle();

    if (insertError) {
      console.error("[request-demo] insert_failed", insertError);
      return jsonResponse(500, {
        success: false,
        error: "insert_failed",
        message: "Não foi possível guardar o pedido."
      });
    }

    console.log("[request-demo] request_created", {
      id: requestRow?.id,
      email: payload.email,
      empresa: payload.empresa
    });

    const notification = buildDemoRequestNotification({
      id: requestRow?.id || null,
      nome: payload.nome,
      empresa: payload.empresa,
      telefone: payload.telefone,
      email: payload.email,
      numero_consultores: payload.numero_consultores
    });

    console.log("ANTES DA NOTIFICACAO");

    const notificationResult = await NotificationService.send({
      empresaId: null,
      type: "demo_request",
      ...notification
    }, {
      adminClient
    });

    console.log("DEPOIS DA NOTIFICACAO");
    
    if (!notificationResult.ok) {
      console.error("[request-demo] notification_failed", notificationResult);
    }

    try {
      const customerNotification = buildDemoRequestCustomerNotification({
        id: requestRow?.id || null,
        nome: payload.nome,
        empresa: payload.empresa,
        email: payload.email,
        numeroConsultores: payload.numero_consultores,
        createdAt
      });

      const customerNotificationResult = await NotificationService.send(customerNotification, {
        adminClient
      });

      if (!customerNotificationResult.ok) {
        console.error(
          "[DemoRequest] customer_confirmation_failed",
          customerNotificationResult
        );
      }
    } catch (error) {
      console.error(
        "[DemoRequest] customer_confirmation_failed",
        error
      );
    }

    return jsonResponse(200, {
      success: true,
      data: {
        id: requestRow?.id || null
      }
    });
  } catch (error) {
    console.error(
      "[request-demo] unexpected_error",
      error
    );

    return jsonResponse(500, {
      success: false,
      error: "unexpected_error",
      message: "Não foi possível enviar o pedido de demonstração."
    });
  }
});
