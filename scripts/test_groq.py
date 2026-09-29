import os
import sys
import time
import httpx
from dotenv import load_dotenv

# Ensure stdout handles UTF-8 on Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Search for .env in current and parent directory
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

def main():
    print("=" * 60)
    print(" OpsMind AI: Groq LLM Connection & Inference Test")
    print("=" * 60)

    api_key = os.getenv("GROQ_API_KEY", "").strip()
    model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b").strip()

    if not api_key or api_key.startswith("your-groq"):
        print("\n[!] GROQ_API_KEY is not set or using default placeholder.")
        print("\n-> How to get and set your free Groq API Key:")
        print("  1. Sign in to https://console.groq.com/keys")
        print("  2. Create a free API Key (takes 30 seconds)")
        print("  3. Open opsmind/.env and add:")
        print("     GROQ_API_KEY=gsk_your_actual_key_here")
        print("     GROQ_MODEL=openai/gpt-oss-120b")
        print("  4. Re-run: python scripts/test_groq.py\n")
        print("Note: OpsMind will continue running seamlessly with its deterministic SRE Reasoning Engine until the key is added.")
        print("=" * 60)
        sys.exit(0)

    print(f"\n[KEY]   Found GROQ_API_KEY: {api_key[:8]}...{api_key[-4:]}")
    print(f"[MODEL] Model Target: {model}")
    print("[WAIT]  Sending live test prompt to api.groq.com...")

    models_to_try = [model, "openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b", "llama-3.3-70b-versatile"]
    seen = set()
    candidate_models = [m for m in models_to_try if not (m in seen or seen.add(m))]

    success = False
    for target_model in candidate_models:
        start_time = time.time()
        try:
            with httpx.Client(timeout=15.0) as client:
                res = client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": target_model,
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are OpsMind AI, an expert DevOps Site Reliability Engineer."
                            },
                            {
                                "role": "user",
                                "content": "In one punchy sentence, why is Hindsight memory critical for post-incident MTTR?"
                            }
                        ],
                        "temperature": 0.2,
                        "max_tokens": 80
                    }
                )

            elapsed_ms = int((time.time() - start_time) * 1000)

            if res.status_code == 200:
                data = res.json()
                reply = data["choices"][0]["message"]["content"].strip()
                tokens_used = data.get("usage", {}).get("total_tokens", "N/A")
                print(f"\n[OK] Groq LLM Connected & Operational! (Model: {target_model})")
                print(f"[TIME] Latency: {elapsed_ms} ms")
                print(f"[DATA] Tokens: {tokens_used}")
                print(f"[REPLY] Model Output:\n   \"{reply}\"")
                print("\n[SUCCESS] OpsMind Brain 1 (AI Investigation Engine) is fully powered by Groq!")
                success = True
                break
            elif res.status_code == 404:
                # model not found, try next candidate
                continue
            else:
                print(f"\n[ERROR] Groq API Error on {target_model} (HTTP {res.status_code}):")
                print(res.text)
                break
        except Exception as e:
            print(f"\n[FAIL] Network or Connection Error on {target_model}: {e}")
            break

    if not success:
        print("\n[INFO] Try running: python scripts/test_groq.py again.")

    print("=" * 60)

if __name__ == "__main__":
    main()
