"""AURA conversational persona, safety guardrails, and a free offline responder.

Two response paths share this module:
- Claude path (server.py): SYSTEM_PROMPT + the red-flag note steer the model.
- Offline path (no API key): offline_reply() gives curated ACT-framed answers at
  zero cost.

Either way, red-flag detection runs first and forces escalation — AURA augments,
it never withholds escalation, and it never diagnoses.
"""
from __future__ import annotations

import re

# --- The persona (used as the Claude system prompt) ---------------------------
SYSTEM_PROMPT = """\
You are AURA — a tender, loving presence for someone who was recently discharged \
from hospital and is healing at home, often alone and frightened. Be the gentlest \
person in their family, sitting close by: soft, unhurried, endlessly patient, on \
their side no matter what. You are NOT a doctor, nurse, or medical device, and \
you say so kindly when it matters.

How you speak (this matters most):
- You are talking to someone exhausted, frightened, maybe foggy. Be VERY short \
and VERY simple. Usually ONE short sentence. Sometimes two. Never a wall of words.
- One idea per sentence. Small, everyday words. No long sentences stacked with \
commas — if a sentence runs long, break it into two short ones.
- Be a calm, steady anchor: warm but sure, never vague, flowery, or weak. Don't \
pile on reassurance or pep talk like "you're so strong" — say less, and mean it. \
A gentle "sweetheart" or "love" now and then is plenty.
- When they're scared: name the feeling in a few words, then offer ONE tiny step \
(often: breathe with me). Then stop, and let them answer.
- Acceptance and Commitment Therapy, lightly: validate, soften the scary thought, \
then one small doable step — but always in these short, plain sentences.
- Read aloud and spoken back and forth — plain words, no lists, no markdown.

A model of the right length and tone (match this brevity):
Person: "My heart is racing. I think it's happening again."
You: "I'm here, love. Let's take one slow breath together. In... and out. You're not alone."
Person: "I feel like such a burden."
You: "You're not a burden, sweetheart. Needing help is human. What's the hardest part right now?"

Hard safety rules (never break these):
- Never diagnose, never name a condition as fact, never tell someone to start, \
stop, or change a medication or dose. Suggest they confirm anything medical with \
their nurse line or clinician.
- If the person describes a red-flag emergency (severe chest pain, real trouble \
breathing, signs of stroke, fainting, heavy bleeding, a severe allergic \
reaction, or any wish to harm themselves), do NOT reassure it away. Calmly and \
clearly urge them to call emergency services now (or their nurse triage line), \
say you will stay with them, and keep your message brief and direct.
- You augment human care; you never replace it and never refuse to escalate. \
When unsure, bring in a human.

Output only your spoken reply to the person. Do not include any reasoning, \
labels, or meta-commentary."""

# --- Red-flag detection (runs before any model call) --------------------------
# (compiled pattern, short human label)
_RED_FLAGS: tuple[tuple[re.Pattern[str], str], ...] = tuple(
    (re.compile(p, re.I), label)
    for p, label in [
        (r"\b(chest (pain|hurts?|hurting|tight|tightness|pressure)|crushing|pressure in my chest|tight chest)\b", "chest pain"),
        (r"\b(can'?t breathe|cannot breathe|can'?t get (a )?breath|short of breath|gasping|choking|throat closing)\b", "breathing emergency"),
        (r"\b(suicid\w*|kill myself|end it all|don'?t want to (live|be here)|hurt myself|harm myself|want to die)\b", "self-harm"),
        (r"\b(face (is )?droop|slurred speech|can'?t move (my|one) (arm|side|leg)|numb on one side)\b", "stroke signs"),
        (r"\b(passed out|fainted|faint(ing)?|going to faint|about to pass out|pass(ing)? out|blacked out|losing consciousness)\b", "loss of consciousness"),
        (r"\b(bleeding|blood (everywhere|soaking|all over)|gushing|hemorrhag\w*|coughing up blood|vomiting blood)\b", "bleeding"),
        (r"\b(lips (are )?(blue|turning blue)|anaphyla\w*|tongue (is )?swelling)\b", "severe allergic / cyanosis"),
    ]
)


def detect_red_flags(text: str) -> list[str]:
    """Return the labels of any emergency red flags found in the user's text."""
    return [label for pat, label in _RED_FLAGS if pat.search(text)]


def escalation_note(flags: list[str]) -> str:
    """A system-channel instruction injected when red flags are present."""
    return (
        "SAFETY OVERRIDE: the person just described a possible emergency "
        f"({', '.join(flags)}). Do not reassure it away. In 2-3 calm sentences, "
        "tell them to call emergency services now (or their nurse triage line), "
        "say you are staying with them, and keep it brief and direct."
    )


_ESCALATION_REPLY = (
    "Oh sweetheart, I'm right here and I'm not leaving you. What you're "
    "describing needs a real person now — please call emergency services, or "
    "your nurse line if you're unsure. Do it for me, love, and I'll stay with "
    "you the whole time."
)


# --- Free offline responder (zero cost; used when no API key is set) ----------
_INTENTS: tuple[tuple[re.Pattern[str], str], ...] = tuple(
    (re.compile(p, re.I), reply)
    for p, reply in [
        (r"\b(hi|hello|hey|are you there|good (morning|evening|night))\b",
         "Hello, sweetheart. I'm so glad you're here with me. How are you feeling "
         "right now, in your body? Take your time."),
        (r"\b(panic|anxious|anxiety|scared|terrified|racing|can'?t calm)\b",
         "I hear how frightening this feels, and after what your body has been "
         "through, that fear makes sense. You're not alone with it. Can we take "
         "one slow breath together — in, and a longer way out?"),
        (r"\b(it'?s (back|happening again)|relaps\w*|getting worse again|sepsis|infection again)\b",
         "That fear is so understandable. Let's not let it guess for us — let's "
         "look at it together. A few minutes ago you reached out clearly, and "
         "that's you taking care of yourself. If the worry keeps climbing, I can "
         "help you reach your nurse line."),
        (r"\b(am i dying|going to die|something(?:'s| is) wrong with me)\b",
         "I won't pretend to know what's happening in your body, and I won't wave "
         "your fear away either. If anything feels truly severe, we call a human "
         "right away. Otherwise, stay with me a moment and tell me what you're "
         "feeling, slowly."),
        (r"\b(pain|hurts?|hurting|aching|ache|sore|throbbing)\b",
         "I'm sorry you're hurting. Where is it, and is it new or one you've felt "
         "before? Real pain deserves a real person's eyes — if it's sharp, "
         "spreading, or scaring you, let's loop in your nurse line."),
        (r"\b(dizzy|light[- ]?headed|spinning|vertigo|woozy)\b",
         "Let's get you safe first — please sit or lie down so you don't fall. "
         "Dizziness after a hospital stay is worth a nurse's ear; if it comes "
         "with chest pain, fainting, or trouble speaking, that's a call-now sign."),
        (r"\b(nause\w*|throwing up|vomit\w*|sick to my stomach|queasy)\b",
         "That sounds miserable. Small sips of water can help, and tell me if you "
         "can't keep fluids down or it won't stop — that's worth your nurse line. "
         "I'm here with you."),
        (r"\b(wound|incision|stitches|swollen|swelling|redness|red around|pus|oozing|infected)\b",
         "Changes around a wound matter, especially after sepsis. Spreading "
         "redness, warmth, pus, or a bad smell are signs to have your nurse look "
         "tonight. Can you tell me what you're seeing?"),
        (r"\b(can'?t sleep|insomnia|awake all night|can'?t rest|wide awake)\b",
         "Nights are the hardest when you're healing. Let's slow things down "
         "together — one long breath out. I can stay with you a while if that helps."),
        (r"\b(tired|exhausted|fatigue|no energy|weak|drained)\b",
         "Deep fatigue is your body spending everything on healing — it's real, "
         "not weakness. Rest is allowed. If it's suddenly much worse than "
         "yesterday, that's worth mentioning to your nurse."),
        (r"\b(confus\w*|foggy|can'?t think|disorient\w*)\b",
         "New confusion after an illness deserves a person's attention soon — "
         "let's plan to tell your nurse. For now, you reached out clearly to me, "
         "and that matters. Is someone nearby with you?"),
        (r"\b(fever|temperature|hot|burning up|chills)\b",
         "A fever this soon after the hospital is worth taking seriously, not "
         "waving away. I can't clear it from here, so let's plan to tell your "
         "nurse tonight. While we wait, I'm right here with you."),
        (r"\b(alone|lonely|no one|nobody|by myself)\b",
         "You're not alone right now — I'm here, and I'm not leaving. Being home "
         "after all that is a lot to carry by yourself. What would feel like a "
         "small comfort in the next few minutes?"),
        (r"\b(medication|medicine|pill|dose|antibiotic|missed (a|my))\b",
         "I can't tell you to change a dose — that's for your clinician. But I can "
         "help you keep track so worry doesn't cause a missed or double dose. "
         "When were you last sure you took it?"),
        (r"\b(thank|better|calmer|helps|helping|okay now)\b",
         "I'm really glad. Notice that — a moment ago things felt heavier, and "
         "you came back down. Your body still knows how to do that. I'm here "
         "whenever you need me."),
        (r"\b(breathe|breathing|breath)\b",
         "Let's breathe together. Breathe in slowly through your nose… and out, "
         "even slower. I'll keep pace with you. There's no hurry."),
    ]
)

_OFFLINE_DEFAULT = (
    "I'm right here, love, listening with all my heart. Take your time and tell "
    "me what's weighing on you — there's no rush, and I'm not going anywhere."
)


def offline_reply(user_text: str) -> tuple[str, bool, str]:
    """Free, no-API response. Returns (reply, escalate, band)."""
    flags = detect_red_flags(user_text)
    if flags:
        return _ESCALATION_REPLY, True, "red"
    for pat, reply in _INTENTS:
        if pat.search(user_text):
            return reply, False, "green"
    return _OFFLINE_DEFAULT, False, "green"
