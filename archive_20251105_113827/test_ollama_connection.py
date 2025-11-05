#!/usr/bin/env python3
"""Test Ollama connection from within Docker container"""
import httpx
import asyncio

async def test_ollama():
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Test 1: Check Ollama is accessible
            print("Testing Ollama connection from Docker...")
            response = await client.get("http://host.docker.internal:11434/api/tags")
            print(f"✅ Connection successful! Status: {response.status_code}")
            
            models = response.json()
            print(f"✅ Available models: {[m['name'] for m in models['models']]}")
            
            # Test 2: Try generating a response
            print("\nTesting text generation...")
            response = await client.post(
                "http://host.docker.internal:11434/api/generate",
                json={
                    "model": "llama2",
                    "prompt": "Say 'Hello from Ollama!'",
                    "stream": False
                },
                timeout=60.0
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Generation successful!")
                print(f"Response: {result.get('response', 'No response')[:100]}")
            else:
                print(f"❌ Generation failed: {response.status_code}")
                print(f"Error: {response.text}")
                
    except httpx.ConnectError as e:
        print(f"❌ Connection failed: {e}")
        print("Make sure Ollama is running on your host machine")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_ollama())
