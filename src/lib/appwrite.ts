import { Client, Functions } from 'appwrite';

const client = new Client()
    // ⚠️ GANTI BARIS INI: Sesuaikan dengan domain host Appwrite lu yang aktif di browser!
    .setEndpoint('https://datamint.appwrite.network/v1') 
    // ⚠️ PASTIKAN PROJECT ID INI BENER: Ambil Project ID yang tertera di dashboard datamint.appwrite.network lu
    .setProject('6a1d855e00147768df88'); 

export const appwriteFunctions = new Functions(client);

export async function askDataMintAgent(queryText: string) {
    try {
        // Langsung nembak ke server Express lokal lu yang port 8080
        const response = await fetch("/api/query", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ query: queryText }),
        });

        if (!response.ok) {
            throw new Error(`Backend local error: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Local Execution Error:", error);
        throw error;
    }
}