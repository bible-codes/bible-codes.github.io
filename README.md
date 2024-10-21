# bible-codes.github.io
Bible Codes App

We are building a browser-based app that allows users to search for Equidistant Letter Sequences (ELS) in the Hebrew Bible. The app will enable users to input phrases or terms, and it will identify patterns or sequences by efficiently searching through the text. The core goal is to deliver fast and accurate search results for both common phrases (e.g., Hebrew dates) and custom user inputs.

To ensure high performance, the app will precompute hashes for frequently searched phrases, making the searches for these terms almost instantaneous. For phrases that are less common, the app will compute hashes dynamically. This hybrid approach balances speed and flexibility, enhancing the user experience without overloading their devices with computations. Precomputed hashes will be stored in the app's resources and cached locally, allowing for quick lookups even when offline.

The technology stack includes JavaScript for the front-end logic, JSON files for storing precomputed hashes, and a service worker for caching. The ELS search and hashing mechanisms will be implemented in JavaScript, leveraging modern browser storage capabilities for offline functionality. The app will use a server-side script to precompute hashes, ensuring consistency across devices while reducing the computational load on users’ machines.

This Project was started by Aharon Zbaida, in loving memory of Shmuel Zbaida Z"L, and inspired by the original paper: 
Witztum, Doron, et al. “Equidistant Letter Sequences in the Book of Genesis.” Statistical Science, vol. 9, no. 3, 1994, pp. 429–38. JSTOR, http://www.jstor.org/stable/2246356. As well as the books that followed by Michael Drosnin, and Jeffrey Satinover
