import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import "server-only";

import { createServerAuthClient } from "@/lib/supabase/server-auth";

// POST /api/requests/[id]/attachments - Upload attachment
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;
    const supabase = await createServerAuthClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("ceo_users")
      .select("org_id, role_code")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // Verify request exists and user has access (org-scoped)
    const { data: request } = await supabase
      .from("ceo_requests")
      .select("id, requester_id, org_id")
      .eq("id", requestId)
      .eq("org_id", profile.org_id)
      .single();

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Only requester or CEO/ADMIN can upload
    const canUpload =
      request.requester_id === user.id ||
      ["CEO", "ADMIN"].includes(profile.role_code);

    if (!canUpload) {
      return NextResponse.json(
        { error: "Only requester or CEO/Admin can upload attachments" },
        { status: 403 }
      );
    }

    // Get file from FormData
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Get CEO config for max file size
    const { data: config } = await supabase
      .from("ceo_config")
      .select("max_attachment_mb")
      .eq("org_id", profile.org_id)
      .single();

    const maxSizeMB = config?.max_attachment_mb || 10;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    if (file.size > maxSizeBytes) {
      return NextResponse.json(
        { error: `File size exceeds ${maxSizeMB}MB limit` },
        { status: 400 }
      );
    }

    // Validate file type (security: prevent executable uploads)
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "text/csv",
    ];

    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed" },
        { status: 400 }
      );
    }

    // Generate storage path
    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `requests/${requestId}/${timestamp}_${sanitizedFilename}`;

    // Upload to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("request-attachments")
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Insert attachment record
    const { data: attachment, error: insertError } = await supabase
      .from("ceo_request_attachments")
      .insert({
        request_id: requestId,
        org_id: profile.org_id,
        filename: file.name,
        content_type: file.type,
        size_bytes: file.size,
        storage_path: storagePath,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      // Cleanup uploaded file if DB insert fails
      await supabase.storage.from("request-attachments").remove([storagePath]);

      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Audit log
    await supabase.from("ceo_audit_logs").insert({
      org_id: profile.org_id,
      entity_type: "request",
      entity_id: requestId,
      action: "attachment_uploaded",
      user_id: user.id,
      new_values: {
        attachment_id: attachment.id,
        filename: file.name,
        size_bytes: file.size,
      },
    });

    return NextResponse.json({ attachment }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE /api/requests/[id]/attachments?attachment_id=xxx - Remove attachment
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;
    const supabase = await createServerAuthClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("ceo_users")
      .select("org_id, role_code")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    const attachmentId = req.nextUrl.searchParams.get("attachment_id");
    if (!attachmentId) {
      return NextResponse.json(
        { error: "attachment_id query parameter required" },
        { status: 400 }
      );
    }

    // Get attachment
    const { data: attachment } = await supabase
      .from("ceo_request_attachments")
      .select("*, request:ceo_requests(requester_id)")
      .eq("id", attachmentId)
      .eq("request_id", requestId)
      .eq("org_id", profile.org_id)
      .single();

    if (!attachment) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 }
      );
    }

    // Only uploader, requester, or CEO/ADMIN can delete
    const canDelete =
      attachment.uploaded_by === user.id ||
      attachment.request.requester_id === user.id ||
      ["CEO", "ADMIN"].includes(profile.role_code);

    if (!canDelete) {
      return NextResponse.json(
        { error: "Insufficient permissions to delete attachment" },
        { status: 403 }
      );
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from("request-attachments")
      .remove([attachment.storage_path]);

    if (storageError) {
      console.error("Storage deletion failed:", storageError);
      // Continue with DB deletion even if storage fails
    }

    // Delete from DB
    const { error: deleteError } = await supabase
      .from("ceo_request_attachments")
      .delete()
      .eq("id", attachmentId)
      .eq("org_id", profile.org_id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Audit log
    await supabase.from("ceo_audit_logs").insert({
      org_id: profile.org_id,
      entity_type: "request",
      entity_id: requestId,
      action: "attachment_deleted",
      user_id: user.id,
      old_values: {
        attachment_id: attachmentId,
        filename: attachment.filename,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
