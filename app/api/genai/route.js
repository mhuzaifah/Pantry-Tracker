import dotenv from 'dotenv'
import { GoogleGenerativeAI } from '@google/generative-ai'
import {NextResponse} from "next/server";

dotenv.config() // Load environment variables from .env file

export async function POST(req, res) {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })

        const data = await req.json()
        const prompt = data.prompt
        let result = null

        if(data.type === 'image') {
            result = await model.generateContent([data.imageToAnalyze, prompt])
        }
        else {
            result = await model.generateContent(prompt)
        }
        const response = await result.response

        return NextResponse.json({output: response.text()})
    } catch (error) {
        console.error(error)
    }
}

