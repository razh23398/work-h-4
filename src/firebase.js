import { initializeApp } from 'firebase/app';
    import { getFirestore } from 'firebase/firestore';

    const firebaseConfig = {
      apiKey: "AIzaSyDKbCN-Aqk4I7LO5pdKfp-DXyn0vbqVebI",
      authDomain: "work-hour-69905.firebaseapp.com",
      projectId: "work-hour-69905",
      storageBucket: "work-hour-69905.firebasestorage.app",
      messagingSenderId: "813015552457",
      appId: "1:813015552457:web:7eaf52c49cf637eecf9818",
      measurementId: "G-3FHNZ0ESEZ"
    };

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    export { db };
