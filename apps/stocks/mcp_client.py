import requests
import json
import sys

URL = "http://127.0.0.1:3845/mcp"

def json_rpc(method, params=None, msg_id=None):
    payload = {
        "jsonrpc": "2.0",
        "method": method,
    }
    if params is not None:
        payload["params"] = params
    if msg_id is not None:
        payload["id"] = msg_id
    
    # print(f"Sending: {json.dumps(payload, indent=2)}")
    headers = {
        "Accept": "application/json, text/event-stream",
        "Content-Type": "application/json"
    }
    # Remove Accept-Encoding to match curl behavior more closely
    # (requests adds it by default)
    # We use a session to keep connection alive if needed
    if not hasattr(json_rpc, 'session'):
        json_rpc.session = requests.Session()
        json_rpc.session.headers.update(headers)
        # Remove Accept-Encoding from session headers if present
        if 'Accept-Encoding' in json_rpc.session.headers:
            del json_rpc.session.headers['Accept-Encoding']

    try:
        # We need to ensure we don't send Accept-Encoding
        # passing headers=headers to post merges them, but session has defaults.
        # Let's force it in the request.
        response = json_rpc.session.post(URL, json=payload, headers=headers)
        response.raise_for_status()
        
        ct = response.headers.get("Content-Type", "")
        if "text/event-stream" in ct:
            # Parse SSE
            print("--- SSE Stream ---")
            json_result = None
            for line in response.text.splitlines():
                print(f"SSE Line: {line}")
                if line.startswith("data: "):
                    data_str = line[6:]
                    try:
                        data = json.loads(data_str)
                        if "result" in data:
                            json_result = data
                    except json.JSONDecodeError:
                        pass
            if json_result:
                return json_result, None
            return None, "SSE response received but no valid JSON result found."
        else:
            return response.json(), None
    except Exception as e:
        err_msg = f"Error: {e}"
        if 'response' in locals():
            err_msg += f"\nResponse text: {response.text}"
        return None, err_msg

def main():
    # 1. Initialize
    print("--- Initializing ---")
    init_result, init_err = json_rpc("initialize", {
        "protocolVersion": "2024-11-05",
        "capabilities": {},
        "clientInfo": {"name": "antigravity-client", "version": "1.0"}
    }, 1)
    
    if not init_result or "error" in init_result:
        print("Initialization failed:", init_result)
        if init_err:
            print("Exception details:", init_err)
        return

    print("Initialization successful.")
    
    # 2. Initialized notification
    json_rpc("notifications/initialized")
    
    # 3. List Tools
    print("\n--- Listing Tools ---")
    tools_result, tools_err = json_rpc("tools/list", {}, 2)
    
    if tools_result and "result" in tools_result:
        tools = tools_result["result"].get("tools", [])
        print(f"Found {len(tools)} tools:")
        for t in tools:
            print(f"- {t['name']}: {t.get('description', 'No description')[:50]}...")
            
        # Check for get_design_context
        target_tool = "get_design_context"
        if any(t['name'] == target_tool for t in tools):
            print(f"\nTool '{target_tool}' found. Attempting to call...")
            
            # 4. Call Tool
            node_id = "0:4"
            print(f"Calling {target_tool} with nodeId='{node_id}'...")
            
            call_result, call_err = json_rpc("tools/call", {
                "name": target_tool,
                "arguments": {"nodeId": node_id}
            }, 3)
            
            if call_result and "result" in call_result:
                print("\n--- Tool Call Result ---")
                content = call_result["result"].get("content", [])
                text_content = ""
                for item in content:
                    if item.get("type") == "text":
                        text_content += item.get("text") + "\n"
                    else:
                        print(f"[Content type: {item.get('type')}]")
                
                with open("design_context.txt", "w") as f:
                    f.write(text_content)
                print("Design context saved to design_context.txt")
            else:
                print("Tool call failed:", call_result)
                if call_err:
                    print("Error details:", call_err)
        else:
            print(f"Tool '{target_tool}' not found.")
            
    else:
        print("Failed to list tools:", tools_result)
        if tools_err:
            print("Error details:", tools_err)

if __name__ == "__main__":
    main()
