// src/app/api/figshare_api_mock/account/route.ts

export async function GET() {
    return new Response(JSON.stringify({
        id: 1495682,
        first_name: "Mock",
        last_name: "User",
        used_quota_private: 0,
        modified_date: "2024-01-24T04:04:04",
        used_quota: 0,
        created_date: "2024-01-24T04:04:04",
        quota: 1073741824, // 1GB in bytes
        group_id: 0,
        institution_user_id: "mock_user",
        institution_id: 1,
        email: "mock@example.com",
        used_quota_public: 0,
        pending_quota_request: false,
        active: 1,
        maximum_file_size: 1073741824 // 1GB in bytes
    }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
        },
    });
}