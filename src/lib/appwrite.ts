import { Client, Functions } from 'appwrite';

const client = new Client()
    // ⚠️ GANTI BARIS INI: Sesuaikan dengan domain host Appwrite lu yang aktif di browser!
    .setEndpoint('https://sgp.cloud.appwrite.io/v1') 
    // ⚠️ PASTIKAN PROJECT ID INI BENER: Ambil Project ID yang tertera di dashboard datamint.appwrite.network lu
    .setProject('6a1d855e00147768df88'); 

export const appwriteFunctions = new Functions(client);

export async function askDataMintAgent(queryText: string) {
    try {
        const execution = await appwriteFunctions.createExecution(
            "6a292a3f00085c9b8fbd",
            JSON.stringify({
                query: queryText
            })
        );

        return JSON.parse(execution.responseBody);
    } catch (error) {
        console.error("Function Execution Error:", error);
        throw error;
    }
}