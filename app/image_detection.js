import { config } from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

config() // Load environment variables from .env file

const apiKey = process.env.API_KEY
console.log('API Key: ' + apiKey)
const genAI = new GoogleGenerativeAI(apiKey)
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

const generateRecipes = async (ingredients) => {
    const formattedIngredients = ingredients.map(item => `${item.name} (${item.quantity})`).join(', ')
    const prompt = `Give me possible recipes that can be made from these ingredients (quantities also provided): ${formattedIngredients}`
    const result = await model.generateContent(prompt)
    const response = await result.response
    console.log(response.text())
}

export { generateRecipes }

