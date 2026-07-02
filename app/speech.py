"""Browser-side voice for AURA using the Web Speech API.

No API key, no network, no audio leaves the machine — the synthesis runs in the
user's browser. Speech is triggered on a Streamlit rerun that follows a button
click (a user gesture), which satisfies autoplay policies.
"""
from __future__ import annotations

# Per-speaker prosody. AURA is paced slow and slightly low for co-regulation;
# Elena is a touch faster and higher so the two read as different people.
_PROSODY = {
    "AURA": {"rate": 0.9, "pitch": 0.95, "prefer": ["Samantha", "Ava", "Allison", "Female"]},
    "ELENA": {"rate": 1.0, "pitch": 1.12, "prefer": ["Moira", "Karen", "Tessa", "Fiona"]},
}


def speak_html(text: str, speaker: str, nonce: int) -> str:
    """Return an invisible HTML component that speaks `text` once on mount."""
    cfg = _PROSODY.get(speaker, _PROSODY["AURA"])
    safe = text.replace("\\", " ").replace("`", "'").replace("\n", " ")
    prefer = cfg["prefer"]
    return f"""
<div style="height:0;overflow:hidden"></div>
<script>
(function() {{
  const NONCE = "{nonce}";
  const TEXT = `{safe}`;
  const RATE = {cfg['rate']};
  const PITCH = {cfg['pitch']};
  const PREFER = {prefer};
  if (!('speechSynthesis' in window)) return;

  function pickVoice(voices) {{
    for (const name of PREFER) {{
      const hit = voices.find(v => v.name && v.name.toLowerCase().includes(name.toLowerCase()));
      if (hit) return hit;
    }}
    return voices.find(v => /en[-_]/i.test(v.lang)) || voices[0] || null;
  }}

  function say() {{
    try {{ window.speechSynthesis.cancel(); }} catch (e) {{}}
    const u = new SpeechSynthesisUtterance(TEXT);
    u.rate = RATE; u.pitch = PITCH; u.volume = 1.0;
    const v = pickVoice(window.speechSynthesis.getVoices());
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  }}

  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length) {{
    say();
  }} else {{
    window.speechSynthesis.onvoiceschanged = say;
    setTimeout(say, 250);
  }}
}})();
</script>
"""
