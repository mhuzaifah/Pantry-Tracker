// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCiFtCjVAIY7h5fHl3-ImR--Vx7BdaI67A",
    authDomain: "inventory-management-a080f.firebaseapp.com",
    projectId: "inventory-management-a080f",
    storageBucket: "inventory-management-a080f.appspot.com",
    messagingSenderId: "79103521447",
    appId: "1:79103521447:web:816f31383d40041cc0e182",
    measurementId: "G-7PWEBFCRJQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

export {firestore};