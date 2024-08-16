import { NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/utils/supabase/supabase-server"
import { CreateArtifactParams, UpdateArtifactParams } from "@/types"

export async function POST(req: NextRequest) {
  const supabase = await getSupabase()
  const { workspace_id, content, is_public } =
    (await req.json()) as CreateArtifactParams

  const { data, error } = await supabase
    .from("artifacts")
    .insert({ workspace_id, content, is_public })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data)
}

export async function GET(req: NextRequest) {
  const supabase = await getSupabase()
  const { searchParams } = new URL(req.url)
  const workspace_id = searchParams.get("workspace_id")

  if (!workspace_id) {
    return NextResponse.json(
      { error: "workspace_id is required" },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from("artifacts")
    .select("*")
    .eq("workspace_id", workspace_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const supabase = await getSupabase()
  const { id, ...updateParams } = (await req.json()) as UpdateArtifactParams & {
    id: string
  }

  const { data, error } = await supabase
    .from("artifacts")
    .update(updateParams)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const supabase = await getSupabase()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 })
  }

  const { error } = await supabase.from("artifacts").delete().eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
