// app/api/mock/projects/route.ts

export async function GET() {
    return new Response(JSON.stringify([
        {
            id: 1,
            title: "Mock Project 1",
            description: "A test project",
            created_date: "2024-01-24T00:00:00Z",
            modified_date: "2024-01-24T00:00:00Z",
            published_date: null,
            url: "http://localhost:3000/projects/1",
            storage: "group",
            role: "Owner"
        },
        {
            id: 2,
            title: "Mock Project 2",
            description: "Another test project",
            created_date: "2024-01-23T00:00:00Z",
            modified_date: "2024-01-23T00:00:00Z",
            published_date: null,
            url: "http://localhost:3000/projects/2",
            storage: "individual",
            role: "Collaborator"
        }
    ]), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
        },
    });
}