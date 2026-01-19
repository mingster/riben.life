import { sqlClient } from "../src/lib/prismadb";
import { calculateRsvpPrice } from "../src/lib/pricing/calculate-rsvp-price";
import { v4 as uuidv4 } from "uuid";

async function main() {
    console.log("Starting Discount Rule Verification...");

    const storeId = "test-store-" + uuidv4();
    const facilityId = "test-facility-" + uuidv4();
    const serviceStaffId = "test-staff-" + uuidv4();
    const orgId = "test-org-" + uuidv4();
    const ownerId = "test-owner-" + uuidv4();

    try {
        // 1. Setup Test Data
        console.log("Creating test data...");

        // Create Mock User/Owner
        await sqlClient.user.create({
            data: {
                id: ownerId,
                email: `test-${uuidv4()}@example.com`,
                name: "Test Owner",
                role: "owner",
                createdAt: new Date(),
                updatedAt: new Date(),
            }
        });

        // Create Organization
        await sqlClient.organization.create({
            data: {
                id: orgId,
                name: "Test Org",
                slug: `test-org-${uuidv4()}`,
                createdAt: new Date(),
            }
        });

        await sqlClient.store.create({
            data: {
                id: storeId,
                name: "Test Store for discounts",
                organizationId: orgId,
                ownerId: ownerId,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            },
        });

        await sqlClient.storeFacility.create({
            data: {
                id: facilityId,
                storeId,
                facilityName: "Tennis Court " + uuidv4(),
                defaultCost: 500,
                defaultCredit: 5,
                capacity: 4,
                defaultDuration: 60,
            },
        });

        await sqlClient.serviceStaff.create({
            data: {
                id: serviceStaffId,
                storeId,
                userId: ownerId, // Reuse owner as staff for simplicity
                defaultCost: 300,
                defaultCredit: 3,
            },
        });

        // Create Discount Rule: $100 off facility, $50 off staff when both selected
        await sqlClient.facilityServiceStaffPricingRule.create({
            data: {
                storeId,
                facilityId,
                serviceStaffId,
                facilityDiscount: 100,
                serviceStaffDiscount: 50,
                priority: 10,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            },
        });

        // 2. Test Case 1: Both Selected (Should match rule)
        console.log("\nTest Case 1: Select both Facility and Staff");
        const result1 = await calculateRsvpPrice({
            storeId,
            facilityId,
            serviceStaffId,
            rsvpTime: new Date(),
        });

        console.log("Result 1:", JSON.stringify(result1, null, 2));

        const expectedTotal1 = (500 + 300) - (100 + 50); // 650
        if (result1.totalCost === expectedTotal1) {
            console.log("✅ Test 1 Passed: Total cost is correct.");
        } else {
            console.error(`❌ Test 1 Failed: Expected ${expectedTotal1}, got ${result1.totalCost}`);
        }

        if (result1.crossDiscount.discountAmount === 150) {
            console.log("✅ Test 1 Passed: Discount amount is correct.");
        } else {
            console.error(`❌ Test 1 Failed: Expected discount 150, got ${result1.crossDiscount.discountAmount}`);
        }

        // 3. Test Case 2: Only Facility (Should NOT match rule)
        console.log("\nTest Case 2: Select only Facility");
        const result2 = await calculateRsvpPrice({
            storeId,
            facilityId,
            serviceStaffId: null,
            rsvpTime: new Date(),
        });

        console.log("Result 2:", JSON.stringify(result2, null, 2));

        const expectedTotal2 = 500;
        if (result2.totalCost === expectedTotal2) {
            console.log("✅ Test 2 Passed: Total cost is correct (no discount).");
        } else {
            console.error(`❌ Test 2 Failed: Expected ${expectedTotal2}, got ${result2.totalCost}`);
        }

    } catch (error) {
        console.error("Test Error:", error);
    } finally {
        // Cleanup
        console.log("\nCleaning up...");
        await sqlClient.store.deleteMany({ where: { id: storeId } });
        await sqlClient.organization.deleteMany({ where: { id: orgId } });
        await sqlClient.user.deleteMany({ where: { id: ownerId } });
    }
}

main();
