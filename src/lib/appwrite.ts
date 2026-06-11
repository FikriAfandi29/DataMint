import { Client, Functions } from 'appwrite';

const client = new Client()
    // ⚠️ GANTI BARIS INI: Sesuaikan dengan domain host Appwrite lu yang aktif di browser!
    .setEndpoint('https://datamint.appwrite.network/v1') 
    // ⚠️ PASTIKAN PROJECT ID INI BENER: Ambil Project ID yang tertera di dashboard datamint.appwrite.network lu
    .setProject('6a1d855e00147768df88'); 

export const appwriteFunctions = new Functions(client);

export async function askDataMintAgent(queryText: string) {
    try {
        const response = await appwriteFunctions.createExecution(
            '6a292a3f00085c9b8fbd', // Pastikan Function ID ini ada di menu Functions dashboard datamint.appwrite.network lu!
            JSON.stringify({ query: queryText })
        );

        if (response.responseBody) {
            return JSON.parse(response.responseBody);
        }
        throw new Error("Empty response body");
    } catch (error) {
        console.error("Appwrite Execution Error:", error);
        throw error;
    }
}