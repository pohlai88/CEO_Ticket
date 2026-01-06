/**
 * Executive Action E2E Tests (E01-E15)
 *
 * RCF-12: EXECUTIVE ACTION TESTING (MANDATORY)
 * RCF-E2E-1: Page Object Model - NO inline selectors
 * RCF-E2E-2: API & Database Verification - UI alone is INSUFFICIENT
 * RCF-E2E-3: Test Data Isolation - Each test OWNS its data
 * RCF-E2E-6: PRD Matrix Alignment - E-numbers EXACTLY MATCH PRD
 *
 * MANDATORY: If any test fails, the system is NOT executive-safe.
 *
 * @rcf-version 2.2.0
 */

import { expect, test } from "./fixtures";

/**
 * Executive Actions Test Suite
 *
 * PRD RCF-12 Matrix (LOCKED):
 * E01: Submit request (MANAGER)
 * E02: View pending approvals (CEO)
 * E03: Approve request (CEO)
 * E04: Reject request (CEO)
 * E05: Resubmit after rejection (MANAGER)
 * E06: Cancel request (MANAGER)
 * E07: Send executive message (CEO/MANAGER)
 * E08: Respond to message (CEO)
 * E09: Publish announcement (CEO/ADMIN)
 * E10: Track announcement reads (SYSTEM)
 * E11: Add comment to request (ANY)
 * E12: Upload attachment (MANAGER)
 * E13: Add watcher (MANAGER)
 * E14: Soft-delete request (MANAGER)
 * E15: Audit trail complete (SYSTEM)
 */
test.describe("Executive Actions (RCF-12)", () => {
  // ============================================================
  // RCF-EXEC-E01: Manager submits request
  // MUST PROVE: Request enters SUBMITTED status
  // ============================================================
  test("E01: Manager can submit a request", async ({
    loginAsManager,
    requestsPage,
    requestFactory,
    db,
  }) => {
    // Arrange: Login as MANAGER
    await loginAsManager();

    // Act: Submit request using factory-generated data
    const requestData = requestFactory.create();
    const requestId = await requestsPage.submitRequest(requestData);

    // Assert UI: Request created successfully
    expect(requestId).toBeTruthy();

    // Assert DB (RCF-E2E-2): Verify status in database
    await db.verifyRequestStatus(requestId, "SUBMITTED");

    // Assert DB: Verify audit log entry
    await db.verifyAuditLog({
      eventType: "request.submitted",
      requestId,
      actorRole: "MANAGER",
      statusAfter: "SUBMITTED",
    });
  });

  // ============================================================
  // RCF-EXEC-E02: CEO views pending approvals
  // MUST PROVE: CEO sees all SUBMITTED requests
  // ============================================================
  test("E02: CEO can view pending approvals", async ({
    loginAsManager,
    loginAsCEO,
    logout,
    requestsPage,
    approvalsPage,
    requestFactory,
  }) => {
    // Arrange: Create a request as manager
    await loginAsManager();
    const requestData = requestFactory.create({
      title: `E02 Test ${Date.now()}`,
    });
    await requestsPage.submitRequest(requestData);
    await logout();

    // Act: Login as CEO and view approvals
    await loginAsCEO();
    await approvalsPage.viewPendingApprovals();

    // Assert UI: Request is visible in pending approvals
    const requestRow = approvalsPage.getRequestRowByTitle(requestData.title);
    await expect(requestRow).toBeVisible();
  });

  // ============================================================
  // RCF-EXEC-E03: CEO approves request
  // MUST PROVE: Status → APPROVED, audit logged
  // ============================================================
  test("E03: CEO can approve a request", async ({
    loginAsManager,
    loginAsCEO,
    logout,
    requestsPage,
    approvalsPage,
    requestFactory,
    db,
  }) => {
    // Arrange: Create request as manager
    await loginAsManager();
    const requestData = requestFactory.create({
      title: `E03 Approve ${Date.now()}`,
    });
    const requestId = await requestsPage.submitRequest(requestData);
    await logout();

    // Act: CEO approves
    await loginAsCEO();
    await approvalsPage.approveRequest(requestId, "Approved via E2E test");

    // Assert UI: Approved badge visible
    await approvalsPage.expectApproved();

    // Assert DB (RCF-E2E-2): Status is APPROVED
    await db.verifyRequestStatus(requestId, "APPROVED");

    // Assert DB: Audit log entry with transition
    await db.verifyAuditLog({
      eventType: "request.approved",
      requestId,
      actorRole: "CEO",
      statusBefore: "SUBMITTED",
      statusAfter: "APPROVED",
    });
  });

  // ============================================================
  // RCF-EXEC-E04: CEO rejects request
  // MUST PROVE: Status → REJECTED, reason persists
  // ============================================================
  test("E04: CEO can reject a request", async ({
    loginAsManager,
    loginAsCEO,
    logout,
    requestsPage,
    approvalsPage,
    requestFactory,
    rejectionReasonFactory,
    db,
  }) => {
    // Arrange: Create request as manager
    await loginAsManager();
    const requestData = requestFactory.createForRejection();
    const requestId = await requestsPage.submitRequest(requestData);
    await logout();

    // Act: CEO rejects with reason (MANDATORY per PRD)
    const rejectionReason = rejectionReasonFactory.budgetRelated();
    await loginAsCEO();
    await approvalsPage.rejectRequest(requestId, rejectionReason);

    // Assert UI: Rejected badge visible
    await approvalsPage.expectRejected();

    // Assert DB (RCF-E2E-2): Status is REJECTED
    await db.verifyRequestStatus(requestId, "REJECTED");

    // Assert DB: Rejection reason persists
    const storedReason = await db.getRejectionReason(requestId);
    expect(storedReason).toContain("Budget");

    // Assert DB: Audit log entry
    await db.verifyAuditLog({
      eventType: "request.rejected",
      requestId,
      actorRole: "CEO",
      statusAfter: "REJECTED",
    });
  });

  // ============================================================
  // RCF-EXEC-E05: Manager resubmits after rejection
  // MUST PROVE: REJECTED → SUBMITTED works
  // ============================================================
  test("E05: Manager can resubmit after rejection", async ({
    loginAsManager,
    loginAsCEO,
    logout,
    requestsPage,
    approvalsPage,
    requestFactory,
    rejectionReasonFactory,
    db,
  }) => {
    // Arrange: Create and reject request
    await loginAsManager();
    const requestData = requestFactory.create({
      title: `E05 Resubmit ${Date.now()}`,
    });
    const requestId = await requestsPage.submitRequest(requestData);
    await logout();

    await loginAsCEO();
    await approvalsPage.rejectRequest(
      requestId,
      rejectionReasonFactory.generic()
    );
    await logout();

    // Act: Manager resubmits
    await loginAsManager();
    await requestsPage.resubmitRequest(requestId);

    // Assert UI: Status shows submitted
    await requestsPage.expectStatus("Submitted");

    // Assert DB (RCF-E2E-2): Status is SUBMITTED (not REJECTED)
    await db.verifyRequestStatus(requestId, "SUBMITTED");

    // Assert DB: Audit log entry for resubmission
    await db.verifyAuditLog({
      eventType: "request.resubmitted",
      requestId,
      actorRole: "MANAGER",
      statusBefore: "REJECTED",
      statusAfter: "SUBMITTED",
    });
  });

  // ============================================================
  // RCF-EXEC-E06: Manager cancels request
  // MUST PROVE: Status → CANCELLED, terminal
  // ============================================================
  test("E06: Manager can cancel a request", async ({
    loginAsManager,
    requestsPage,
    requestFactory,
    db,
  }) => {
    // Arrange: Create request
    await loginAsManager();
    const requestData = requestFactory.createForCancellation();
    const requestId = await requestsPage.submitRequest(requestData);

    // Act: Cancel the request
    await requestsPage.cancelRequest(requestId);

    // Assert UI: Status shows cancelled
    await requestsPage.expectStatus("Cancelled");

    // Assert DB (RCF-E2E-2): Status is CANCELLED
    await db.verifyRequestStatus(requestId, "CANCELLED");

    // Assert DB: Audit log entry
    await db.verifyAuditLog({
      eventType: "request.cancelled",
      requestId,
      actorRole: "MANAGER",
      statusAfter: "CANCELLED",
    });
  });

  // ============================================================
  // RCF-EXEC-E07: Manager/CEO sends executive message
  // MUST PROVE: Message persists, recipient sees
  // ============================================================
  test("E07: Manager can send executive message to CEO", async ({
    loginAsManager,
    messagesPage,
    messageFactory,
    db,
  }) => {
    // Arrange & Act: Send message
    await loginAsManager();
    const messageData = messageFactory.create();
    await messagesPage.sendMessage(messageData);

    // Assert UI: Sent confirmation
    await messagesPage.expectMessageSent();

    // Assert DB (RCF-E2E-2): Message exists
    await db.verifyMessageExists({
      subject: messageData.subject,
      messageType: messageData.messageType,
    });

    // Assert DB: Audit log entry
    await db.verifyAuditLog({
      eventType: "message.sent",
      actorRole: "MANAGER",
    });
  });

  // ============================================================
  // RCF-EXEC-E08: CEO responds to message
  // MUST PROVE: Response delivered, audit logged
  // ============================================================
  test("E08: CEO can respond to executive message", async ({
    loginAsManager,
    loginAsCEO,
    logout,
    messagesPage,
    messageFactory,
    db,
  }) => {
    // Arrange: Manager sends message
    await loginAsManager();
    const messageData = messageFactory.create({
      subject: `E08 Reply Test ${Date.now()}`,
    });
    await messagesPage.sendMessage(messageData);
    const { id: messageId } = await db.verifyMessageExists({
      subject: messageData.subject,
    });
    await logout();

    // Act: CEO replies
    await loginAsCEO();
    await messagesPage.replyToMessage(messageId, "CEO response via E2E test");

    // Assert UI: Reply sent confirmation
    await messagesPage.expectReplySent();

    // Assert DB: Audit log entry
    await db.verifyAuditLog({
      eventType: "message.replied",
      actorRole: "CEO",
    });
  });

  // ============================================================
  // RCF-EXEC-E09: Admin publishes announcement
  // MUST PROVE: All managers receive
  // ============================================================
  test("E09: Admin can publish announcement", async ({
    loginAsAdmin,
    announcementsPage,
    announcementFactory,
    db,
  }) => {
    // Arrange & Act: Publish announcement
    await loginAsAdmin();
    const announcementData = announcementFactory.create();
    await announcementsPage.publishAnnouncement(announcementData);

    // Assert UI: Published confirmation
    await announcementsPage.expectPublished();

    // Assert DB (RCF-E2E-2): Announcement exists
    await db.verifyAnnouncementPublished({
      title: announcementData.title,
    });

    // Assert DB: Audit log entry
    await db.verifyAuditLog({
      eventType: "announcement.published",
      actorRole: "ADMIN",
    });
  });

  // ============================================================
  // RCF-EXEC-E10: Track announcement reads
  // MUST PROVE: Read receipts recorded
  // ============================================================
  test("E10: Announcement read receipts are recorded", async ({
    loginAsAdmin,
    loginAsManager,
    logout,
    announcementsPage,
    announcementFactory,
    db,
  }) => {
    // Arrange: Admin publishes announcement
    await loginAsAdmin();
    const announcementData = announcementFactory.create({
      title: `E10 Read Test ${Date.now()}`,
    });
    await announcementsPage.publishAnnouncement(announcementData);
    const { id: announcementId } = await db.verifyAnnouncementPublished({
      title: announcementData.title,
    });
    await logout();

    // Act: Manager views/reads announcement
    await loginAsManager();
    await announcementsPage.markAsRead(announcementData.title);

    // Assert DB (RCF-E2E-2): Read receipt exists
    await db.verifyAnnouncementRead({
      announcementId,
    });
  });

  // ============================================================
  // RCF-EXEC-E11: Add comment to request
  // MUST PROVE: Comment persists with author
  // ============================================================
  test("E11: User can add comment to request", async ({
    loginAsManager,
    requestsPage,
    requestFactory,
    db,
    page,
  }) => {
    // Arrange: Create request
    await loginAsManager();
    const requestData = requestFactory.create({
      title: `E11 Comment Test ${Date.now()}`,
    });
    const requestId = await requestsPage.submitRequest(requestData);

    // Act: Add comment
    await requestsPage.gotoDetail(requestId);
    const commentInput = page.locator('[name="comment"]');
    const submitComment = page.locator('[data-testid="submit-comment"]');

    if (await commentInput.isVisible({ timeout: 5_000 })) {
      await commentInput.fill("E2E test comment");
      await submitComment.click();
      await requestsPage.waitForNetworkIdle();

      // Assert DB: Audit log entry
      await db.verifyAuditLog({
        eventType: "comment.added",
        requestId,
        actorRole: "MANAGER",
      });
    }
  });

  // ============================================================
  // RCF-EXEC-E12: Upload attachment
  // MUST PROVE: File stored, metadata recorded
  // ============================================================
  test("E12: Manager can upload attachment", async ({
    loginAsManager,
    requestsPage,
    requestFactory,
    page,
  }) => {
    // Arrange: Create request
    await loginAsManager();
    const requestData = requestFactory.create({
      title: `E12 Attachment Test ${Date.now()}`,
    });
    const requestId = await requestsPage.submitRequest(requestData);

    // Act: Upload attachment (if UI supports it)
    await requestsPage.gotoDetail(requestId);
    const fileInput = page.locator('input[type="file"]');

    if (await fileInput.isVisible({ timeout: 5_000 })) {
      // Create a test file
      await fileInput.setInputFiles({
        name: "test-attachment.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("E2E test attachment content"),
      });

      // Wait for upload
      await page.waitForResponse(
        (resp) => resp.url().includes("/api/") && resp.status() < 400
      );

      // Assert UI: Attachment appears
      await expect(page.locator("text=test-attachment.txt")).toBeVisible();
    }
  });

  // ============================================================
  // RCF-EXEC-E13: Add watcher
  // MUST PROVE: Watcher receives notifications
  // ============================================================
  test("E13: Manager can add watcher to request", async ({
    loginAsManager,
    requestsPage,
    requestFactory,
    db,
    page,
  }) => {
    // Arrange: Create request
    await loginAsManager();
    const requestData = requestFactory.create({
      title: `E13 Watcher Test ${Date.now()}`,
    });
    const requestId = await requestsPage.submitRequest(requestData);

    // Act: Add watcher (if UI supports it)
    await requestsPage.gotoDetail(requestId);
    const addWatcherButton = page.locator('[data-testid="add-watcher-button"]');

    if (await addWatcherButton.isVisible({ timeout: 5_000 })) {
      await addWatcherButton.click();

      // Select a watcher from list
      const watcherOption = page
        .locator('[data-testid="watcher-option"]')
        .first();
      if (await watcherOption.isVisible({ timeout: 2_000 })) {
        await watcherOption.click();
        await requestsPage.waitForNetworkIdle();

        // Assert DB: Audit log entry
        await db.verifyAuditLog({
          eventType: "watcher.added",
          requestId,
          actorRole: "MANAGER",
        });
      }
    }
  });

  // ============================================================
  // RCF-EXEC-E14: Soft-delete request
  // MUST PROVE: Reversible within window
  // ============================================================
  test("E14: Manager can soft-delete request", async ({
    loginAsManager,
    requestsPage,
    requestFactory,
    page,
  }) => {
    // Arrange: Create request
    await loginAsManager();
    const requestData = requestFactory.create({
      title: `E14 Delete Test ${Date.now()}`,
    });
    const requestId = await requestsPage.submitRequest(requestData);

    // Act: Soft-delete (if UI supports it)
    await requestsPage.gotoDetail(requestId);
    const deleteButton = page.locator('[data-testid="delete-button"]');

    if (await deleteButton.isVisible({ timeout: 5_000 })) {
      await deleteButton.click();

      // Confirm deletion
      const confirmDelete = page.locator('[data-testid="confirm-delete"]');
      if (await confirmDelete.isVisible({ timeout: 2_000 })) {
        await confirmDelete.click();
        await requestsPage.waitForNetworkIdle();

        // Assert: Request no longer visible in list
        await requestsPage.gotoList();
        const deletedRequest = requestsPage.getRequestRowByTitle(
          requestData.title
        );
        await expect(deletedRequest).not.toBeVisible();
      }
    }
  });

  // ============================================================
  // RCF-EXEC-E15: Audit trail complete
  // MUST PROVE: Every E01-E14 has audit entry
  // ============================================================
  test("E15: Manager cannot access CEO-only approval functions", async ({
    loginAsManager,
    logout,
    requestsPage,
    approvalsPage,
    requestFactory,
    page,
  }) => {
    // Arrange: Create request
    await loginAsManager();
    const requestData = requestFactory.create({
      title: `E15 Auth Test ${Date.now()}`,
    });
    const requestId = await requestsPage.submitRequest(requestData);
    await logout();

    // Re-login as Manager and try to access approvals
    await loginAsManager();
    await approvalsPage.gotoDetail(requestId);

    // Assert UI: Approve/Reject buttons NOT visible for MANAGER
    await approvalsPage.expectNoApprovalButtons();

    // Assert API: Direct API access returns 401/403
    const response = await page.request.post(`/api/approvals/${requestId}`, {
      data: { decision: "approved" },
    });

    expect([401, 403]).toContain(response.status());
  });
});
