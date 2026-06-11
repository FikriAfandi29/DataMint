import { Client, Functions } from 'appwrite';

// 1. Konfigurasi awal Client Appwrite
const client = new Client()
    .setEndpoint('https://sgp.cloud.appwrite.io/v1') // Endpoint resmi Appwrite Cloud
    .setProject('6a1d855e00147768df88');          // Project ID dari dashboard lu

export const appwriteFunctions = new Functions(client);

/**
 * Fungsi global buat nembak AI Agent DataMint lu di Appwrite
 * @param queryText Teks query dari user (misal: "Analisis inflasi 2026")
 */
export async function askDataMintAgent(queryText: string) {
    try {
        const response = await appwriteFunctions.createExecution(
            'datamint-engine-2026', // Sesuai dengan Function ID lu yang aktif
            JSON.stringify({ query: queryText }) // Dikirim dalam format string JSON
        );

        if (response.responseBody) {
            // Karena backend balikin JSON, kita parse dulu sebelum dikirim ke UI
            return JSON.parse(response.responseBody);
        }
        throw new Error("Response body dari Appwrite kosong");
    } catch (error) {
        console.error("Gagal mengeksekusi Appwrite Function:", error);
        throw error;
    }
}