# Security Specification - Khmer Teacher Pro

## Data Invariants
- Each teacher has their own subcollection of students.
- A teacher can only read, create, update, or delete students in their own `teachers/{userId}/students` collection.
- Students must have a name, gender, level, and className.

## The Dirty Dozen Payloads
1. **Unauthorized Read**: Authenticated user trying to read `teachers/other-uid/students`.
2. **Identity Spoofing**: Authenticated user trying to create a student in `teachers/other-uid/students`.
3. **Missing Category**: Creating a student without a name.
4. **Invalid Level**: Creating a student with level "extremely good" (not in enum).
5. **Junk ID**: Creating a student with a 2KB document ID.
6. **Shadow Field**: Adding an `isAdmin: true` field to a student document.
7. **PII Blanket**: Trying to list all teachers' students.
8. **Update Hijack**: User A trying to update User B's student names.
9. **Outcome Shortcut**: (N/A for this app)
10. **Type Poisoning**: Sending `level: 123` instead of a string.
11. **Size Bombing**: Sending a `name` that is 500 characters long.
12. **Orphan Write**: (N/A as students are sub-resources).

## Rules Logic
- `isValidStudent(data)`: Validates name size and enum values.
- `match /teachers/{userId}/students/{studentId}`: Checks `request.auth.uid == userId`.
