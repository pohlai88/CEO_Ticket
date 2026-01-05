import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { createRequestSchema } from "@/lib/validations/request";
import { createServerAuthClient } from "@/lib/supabase/server-auth";
import { writeAuditLog } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    // 1. Verify user is authenticated
    const supabase = await createServerAuthClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get user's org_id and role from DB
    const { data: user, error: userError } = await supabase
      .from("ceo_users")
      .select("org_id, role_code")
      .eq("id", authUser.id)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 403 }
      );
    }

    const { org_id: orgId, role_code: roleCode } = user;

    // 3. Verify MANAGER/CEO role
    if (!["MANAGER", "CEO"].includes(roleCode)) {
      return NextResponse.json(
        { error: "Only managers and CEOs can create requests" },
        { status: 403 }
      );
    }

    // 4. Parse and validate request body
    const body = await req.json();
    const validation = createRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const validatedData = validation.data;

    // 5. Create request with DRAFT status
    const { data: request, error: createError } = await supabase
      .from("ceo_requests")
      .insert({
        org_id: orgId,
        title: validatedData.title,
        description: validatedData.description,
        priority_code: validatedData.priority_code,
        category_id: validatedData.category_id,
        status_code: "DRAFT",
        request_version: 1,
        requester_id: authUser.id,
        created_by: authUser.id,
        updated_by: authUser.id,
        last_activity_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (createError) {
      console.error("Request creation error:", {
        error: createError,
        orgId,
        userId: authUser.id,
      });
      return NextResponse.json(
        { error: "Failed to create request", details: createError.message },
        { status: 500 }
      );
    }

    // 6. Audit log the creation
    await writeAuditLog({
      org_id: orgId,
      user_id: authUser.id,
      entity_type: "request",
      entity_id: request.id,
      action: "created",
      actor_role_code: roleCode,
      new_values: {
        title: validatedData.title,
        priority_code: validatedData.priority_code,
        status_code: "DRAFT",
      },
    });

    return NextResponse.json({ request }, { status: 201 });
  } catch (err) {
    console.error("POST /api/requests error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // 1. Verify user is authenticated
    const supabase = await createServerAuthClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get user's org_id from DB
    const { data: user, error: userError } = await supabase
      .from("ceo_users")
      .select("org_id")
      .eq("id", authUser.id)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 403 }
      );
    }

    const { org_id: orgId } = user;

    // 3. Get query params
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const showDeleted = searchParams.get("show_deleted") === "true";

    // 4. Build and execute query
    let query = supabase
      .from("ceo_requests")
      .select("*, ceo_users!requester_id(email)")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status_code", status);
    if (priority) query = query.eq("priority_code", priority);
    if (!showDeleted) query = query.is("deleted_at", null);

    const { data: requests, error: fetchError } = await query;

    if (fetchError) {
      console.error("Request fetch error:", { error: fetchError, orgId });
      return NextResponse.json(
        { error: "Failed to fetch requests", details: fetchError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ requests }, { status: 200 });
  } catch (err) {
    console.error("GET /api/requests error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
