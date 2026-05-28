# Security Specification (TDD) for Khmer Teacher Pro

## 1. Data Invariants

1. **Teacher Isolation**: A teacher can only read, create, update, or delete data (classes, students, configurations) that belong to their own teacher document (`/teachers/{teacherId}/**`). No cross-teacher access is permitted.
2. **Teacher Creation Safety**: Anyone can register a brand new teacher account, but they cannot overwrite existing teachers. Once a teacher account is created, they can only modify their own profile, or delete it if they are authorized.
3. **Data Integrity**: Students and classes must contain valid structures (correct types, sizes, and formats). Timestamps like `updatedAt` and `createdAt` must match server timestamps.
4. **No Unauthorized Public Reads**: Access to classes and student lists is strictly authenticated and restricted to the respective teacher.

## 2. The "Dirty Dozen" Payloads (Attacks & Denials)

1. **Self-Assign Option (Identity Spoofing)**: Attacker attempts to modify another teacher's profile (`/teachers/anotherTeacher`) by sending custom payloads.
2. **Overwriting Existing Teachers**: Attacker tries to register using an already existing teacher's document ID to hijack it.
3. **Ghost Classroom Inject**: Attacker creates a classroom under another teacher's collection `/teachers/teacherA/classes/attackerClass` without login.
4. **Global Query Harvesting**: Anonymous user tries to list all classes across the database without teacher authentication.
5. **Score Injection (Resource Poisoning)**: Unauthenticated user updates a student's score directly to a fraudulent value (`999999`) or sets status to incorrect values.
6. **Student Clone with False Class ID**: User adds/writes a student inside `/teachers/teacherA/classes/classB/students/studentId` but sets the internal `classId` parameter to `classC` to cause database inconsistencies.
7. **Bypassing Server Timestamps with Spoofed Dates**: Attacker attempts to set `updatedAt` to a future year `2035-12-31` on the client.
8. **Poisonous Document ID Inject (Junk Characters)**: Attacker passes a 50KB string of special characters `$$&&!!!///...` as a document ID to crash or overflow Firestore indexes.
9. **Bulk List Denial (Denial of Wallet)**: Attacker requests an un-indexed collection list query with no filters to force Firestore to search the entire global space.
10. **State Skipping**: Attacker tries to bypass student's status validations and injection check.
11. **Shadow Key Attacks**: Attacker attempts to update a class document and includes an un-whitelisted "ghost field" `isSystemAdmin: true` to bypass role checks.
12. **Null Identifier Write**: Writing student data with missing mandatory field `name` or typing it as a boolean.

## 3. Test Runner (firestore.rules.test.ts Spec)

All rules checks are written to prevent these 12 attacks and verify that any violation returns `PERMISSION_DENIED` on Firestore. We validates all incoming entities' size, type, presence of whitelisted fields, and proper ownership matching.
