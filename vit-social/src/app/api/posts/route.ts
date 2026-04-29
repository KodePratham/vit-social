import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAcceptedFriendIds } from "@/lib/post-friends";
import {
  getMongoClient,
  getMongoDbName,
  isMongoConfigured,
  POSTS_COLLECTION,
} from "@/lib/mongodb";
import { profileSelect, type UserProfile } from "@/lib/profile-shared";

export const runtime = "nodejs";

const MAX_BODY_LENGTH = 8000;
const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 100;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  try {
    if (!isMongoConfigured()) {
      return jsonError("Posts store is not configured (missing MONGODB_URI).", 503);
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError("Unauthorized", 401);
    }

    const url = new URL(request.url);
    const limitRaw = url.searchParams.get("limit");
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, limitRaw ? Number.parseInt(limitRaw, 10) || DEFAULT_LIMIT : DEFAULT_LIMIT),
    );

    let friendIds: string[];
    try {
      friendIds = await getAcceptedFriendIds(supabase, user.id);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load friends.";
      return jsonError(message, 500);
    }

    const visibleAuthorIds = [...new Set([user.id, ...friendIds])];

    const mongo = await getMongoClient();
    const coll = mongo.db(getMongoDbName()).collection(POSTS_COLLECTION);
    const docs = await coll
      .find({ authorId: { $in: visibleAuthorIds } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    const authorIds = [...new Set(docs.map((d) => d.authorId as string))];
    const profileById = new Map<string, Pick<UserProfile, "id" | "full_name" | "email" | "avatar_url">>();

    if (authorIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from("users")
        .select(`${profileSelect}`)
        .in("id", authorIds);

      if (profilesError) {
        return jsonError(profilesError.message, 500);
      }

      for (const p of (profiles ?? []) as UserProfile[]) {
        profileById.set(p.id, {
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          avatar_url: p.avatar_url,
        });
      }
    }

    const posts = docs.map((doc) => ({
      id: doc._id.toString(),
      authorId: doc.authorId as string,
      body: doc.body as string,
      createdAt: (doc.createdAt as Date).toISOString(),
      author: profileById.get(doc.authorId as string) ?? null,
    }));

    return NextResponse.json({ posts });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected server error.";
    return jsonError(message, 500);
  }
}

export async function POST(request: Request) {
  try {
    if (!isMongoConfigured()) {
      return jsonError("Posts store is not configured (missing MONGODB_URI).", 503);
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError("Unauthorized", 401);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("Invalid JSON body.", 400);
    }

    if (!body || typeof body !== "object" || !("body" in body)) {
      return jsonError('Expected JSON object with string "body".', 400);
    }

    const text = (body as { body: unknown }).body;
    if (typeof text !== "string") {
      return jsonError('Field "body" must be a string.', 400);
    }

    const trimmed = text.trim();
    if (trimmed.length === 0) {
      return jsonError("Post cannot be empty.", 400);
    }

    if (trimmed.length > MAX_BODY_LENGTH) {
      return jsonError(`Post is too long (max ${MAX_BODY_LENGTH} characters).`, 400);
    }

    const createdAt = new Date();
    const mongo = await getMongoClient();
    const coll = mongo.db(getMongoDbName()).collection(POSTS_COLLECTION);
    const insertOne = await coll.insertOne({
      authorId: user.id,
      body: trimmed,
      createdAt,
    });

    return NextResponse.json(
      {
        post: {
          id: insertOne.insertedId.toString(),
          authorId: user.id,
          body: trimmed,
          createdAt: createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected server error.";
    return jsonError(message, 500);
  }
}
