// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAdt6M7ina-Wo_Lqpc8O8-EjRmMyvpazeM",
  authDomain: "shard-59913.firebaseapp.com",
  projectId: "shard-59913",
  storageBucket: "shard-59913.firebasestorage.app",
  messagingSenderId: "882989295593",
  appId: "1:882989295593:web:3fb0467e82f105db444d78",
  measurementId: "G-7VG2JBHLB3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);