#!/usr/bin/env python3
"""初始化 Ian & Justin 到 pin0513@gmail.com 的家庭"""

import os
import sys
import firebase_admin
from firebase_admin import credentials, auth, firestore
from datetime import datetime, timezone

CRED_PATH = "/Users/paul_huang/DEV/projects/mido-learning/credentials/firebase-admin-key.json"
TARGET_EMAIL = "pin0513@gmail.com"

# Init
cred = credentials.Certificate(CRED_PATH)
firebase_admin.initialize_app(cred)
db = firestore.client()

print("Looking up user:", TARGET_EMAIL)
user = auth.get_user_by_email(TARGET_EMAIL)
uid = user.uid
family_id = f"family_{uid}"
print(f"UID: {uid}")
print(f"FamilyId: {family_id}")

# Ensure family doc exists
family_ref = db.collection("families").document(family_id)
family_snap = family_ref.get()
if not family_snap.exists:
    family_ref.set({
        "familyId": family_id,
        "adminUid": uid,
        "adminEmails": [TARGET_EMAIL],
        "displayCode": "MIDO0513",
        "createdAt": firestore.SERVER_TIMESTAMP,
        "updatedAt": firestore.SERVER_TIMESTAMP,
    })
    print("Created family doc")
else:
    print("Family doc exists:", family_snap.to_dict().get("displayCode", "no code"))

# Upsert player
def upsert_player(player_id, name, color, emoji, role, xp=0):
    score_ref = family_ref.collection("player-scores").document(player_id)
    snap = score_ref.get()
    if snap.exists:
        print(f"  Player '{name}' already exists -> skipping")
        return
    score_ref.set({
        "playerId": player_id,
        "name": name,
        "color": color,
        "emoji": emoji,
        "role": role,
        "achievementPoints": xp,
        "redeemablePoints": xp,
        "totalEarned": xp,
        "totalDeducted": 0,
        "totalRedeemed": 0,
        "createdAt": firestore.SERVER_TIMESTAMP,
    })
    print(f"  Created player: {name} ({player_id})")

print("\nCreating players...")
upsert_player("ian",    "Ian（米豆）",    "#f59e0b", "🌾", "大哥")
upsert_player("justin", "Justin（毛豆）", "#10b981", "🌿", "弟弟")

print("\n✅ Done! 家庭代碼:", family_snap.to_dict().get("displayCode") if family_snap.exists else "MIDO0513")
print("   Ian 和 Justin 已加入家庭積分板")
print("   請到 Admin 後台為玩家設定密碼")
