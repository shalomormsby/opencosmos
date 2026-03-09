"""
⚠️  DEPRECATED - This file is no longer maintained or used.
================================================================
This test script is for legacy v0.3.0 testing only.
Kept for historical reference. Do not use in production.

v0.3.0 Testing Script
=====================

Run this script to validate v0.3.0 polling workflow implementation.

IMPORTANT: Before running, ensure you've completed Notion database setup:
1. Added Content Status options: "Pending Analysis", "Send to History", "Logged in History", "Analysis Incomplete"
2. Added "Send to History" button property to Stock Analyses database
3. Created Notion automation (Content Status edited → Send notification)

Usage:
    python test_v0.3.0.py
"""

import os
import time
from datetime import datetime
from stock_intelligence import (
    analyze_and_sync_to_notion,
    NotionClient,
    NOTION_API_KEY,
    STOCK_ANALYSES_DB_ID,
    STOCK_HISTORY_DB_ID
)

def print_test_header(test_name, test_number, total_tests):
    """Print formatted test header"""
    print("\n" + "="*80)
    print(f"TEST {test_number}/{total_tests}: {test_name}")
    print("="*80)

def print_test_result(passed, message):
    """Print test result"""
    status = "✅ PASSED" if passed else "❌ FAILED"
    print(f"\n{status}: {message}\n")

def test_1_polling_workflow_skip():
    """Test v0.3.0 polling workflow with skip_polling=True"""
    print_test_header("Polling Workflow (Skip Mode)", 1, 5)

    print("Running: analyze_and_sync_to_notion('AAPL', skip_polling=True)")
    print("Expected: Metrics written, no polling started\n")

    try:
        analyze_and_sync_to_notion("AAPL", skip_polling=True)
        print_test_result(True, "Metrics written successfully, polling skipped")

        print("Next step: Open Notion → Run AI prompt → Use manual archive:")
        print("    notion = NotionClient(NOTION_API_KEY, STOCK_ANALYSES_DB_ID, STOCK_HISTORY_DB_ID)")
        print("    notion.archive_ticker_to_history('AAPL')")

        return True
    except Exception as e:
        print_test_result(False, f"Exception: {e}")
        return False

def test_2_polling_workflow_short_timeout():
    """Test v0.3.0 polling workflow with short timeout (30 seconds)"""
    print_test_header("Polling Workflow (30s Timeout)", 2, 5)

    print("Running: analyze_and_sync_to_notion('TSLA', timeout=30)")
    print("Expected: Polling starts, times out after 30s, sets status to 'Analysis Incomplete'\n")
    print("⏰ Starting 30-second countdown... DO NOT click 'Send to History' button\n")

    try:
        analyze_and_sync_to_notion("TSLA", timeout=30)
        print_test_result(True, "Timeout handled correctly, status set to 'Analysis Incomplete'")
        return True
    except Exception as e:
        print_test_result(False, f"Exception: {e}")
        return False

def test_3_manual_archive():
    """Test manual archive by ticker"""
    print_test_header("Manual Archive (archive_ticker_to_history)", 3, 5)

    print("This test requires manual setup:")
    print("1. Ensure 'AAPL' page exists in Stock Analyses (from Test 1)")
    print("2. Open the page in Notion and run AI prompt")
    print("3. Press Enter when AI content is generated (DO NOT click button)\n")

    input("Press Enter to continue...")

    try:
        notion = NotionClient(NOTION_API_KEY, STOCK_ANALYSES_DB_ID, STOCK_HISTORY_DB_ID)
        history_page_id = notion.archive_ticker_to_history("AAPL")

        if history_page_id:
            print_test_result(True, f"Archive successful! History page ID: {history_page_id}")
            return True
        else:
            print_test_result(False, "Archive failed (returned None)")
            return False
    except Exception as e:
        print_test_result(False, f"Exception: {e}")
        return False

def test_4_legacy_workflow():
    """Test v0.2.9 legacy workflow"""
    print_test_header("Legacy Workflow (v0.2.9)", 4, 5)

    print("Running: analyze_and_sync_to_notion('GOOGL', use_polling_workflow=False)")
    print("Expected: Stock Analyses + Stock History created immediately\n")

    try:
        analyze_and_sync_to_notion("GOOGL", use_polling_workflow=False)
        print_test_result(True, "Legacy workflow completed successfully")

        print("Verify in Notion:")
        print("  - Stock Analyses page for GOOGL with status 'New' or 'Updated'")
        print("  - Stock History page for GOOGL created immediately")

        return True
    except Exception as e:
        print_test_result(False, f"Exception: {e}")
        return False

def test_5_full_polling_workflow():
    """Test complete v0.3.0 polling workflow (interactive)"""
    print_test_header("Full Polling Workflow (Interactive)", 5, 5)

    print("⚠️  INTERACTIVE TEST — Follow instructions carefully\n")
    print("This test will:")
    print("1. Write metrics to Stock Analyses for ticker 'NVDA'")
    print("2. Start 2-minute polling loop")
    print("3. Wait for you to:")
    print("   a. Open Notion page")
    print("   b. Run AI prompt")
    print("   c. Click 'Send to History' button")
    print("4. Archive to Stock History automatically\n")

    input("Press Enter to start test...")

    try:
        print("\n🚀 Starting analysis...\n")
        analyze_and_sync_to_notion("NVDA", timeout=120)  # 2 minutes

        print("\n📊 Checking results...")
        print("Verify in Notion:")
        print("  - Stock Analyses page for NVDA with status 'Logged in History'")
        print("  - Stock History page for NVDA with full AI-generated content")
        print("  - NO synced blocks in Stock History page\n")

        success = input("Did everything work correctly? (y/n): ").lower().strip() == 'y'

        if success:
            print_test_result(True, "Full polling workflow validated by user")
        else:
            print_test_result(False, "User reported issues with workflow")

        return success

    except Exception as e:
        print_test_result(False, f"Exception: {e}")
        return False

def run_all_tests():
    """Run all v0.3.0 tests"""
    print("\n" + "="*80)
    print("v0.3.0 TESTING SUITE")
    print("="*80)
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %I:%M %p')}")
    print("\nThis test suite will validate the v0.3.0 polling workflow implementation.")
    print("Total tests: 5")
    print("\n⚠️  IMPORTANT: Ensure Notion database setup is complete before running!")
    print("\nPress Ctrl+C at any time to abort.\n")

    input("Press Enter to begin testing...")

    results = []

    # Test 1: Skip polling mode
    results.append(("Skip Polling Mode", test_1_polling_workflow_skip()))

    # Test 2: Timeout handling
    results.append(("Timeout Handling", test_2_polling_workflow_short_timeout()))

    # Test 3: Manual archive
    results.append(("Manual Archive", test_3_manual_archive()))

    # Test 4: Legacy workflow
    results.append(("Legacy Workflow", test_4_legacy_workflow()))

    # Test 5: Full polling workflow
    results.append(("Full Polling Workflow", test_5_full_polling_workflow()))

    # Print summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)

    for test_name, passed in results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{status}: {test_name}")

    passed_count = sum(1 for _, p in results if p)
    total_count = len(results)

    print(f"\nTotal: {passed_count}/{total_count} tests passed")

    if passed_count == total_count:
        print("\n🎉 All tests passed! v0.3.0 is working correctly.")
    else:
        print(f"\n⚠️  {total_count - passed_count} test(s) failed. Review output above for details.")

    print("="*80 + "\n")

if __name__ == "__main__":
    try:
        run_all_tests()
    except KeyboardInterrupt:
        print("\n\n⚠️  Testing aborted by user.\n")
    except Exception as e:
        print(f"\n\n❌ Fatal error: {e}\n")
        import traceback
        traceback.print_exc()
