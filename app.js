let map;

let scanner = null;

let currentQuest = null;

let playerData = {

    username: "",

    score: 0,

    completed: []

};


// ======================================
// CHARGEMENT
// ======================================

window.addEventListener(
    "DOMContentLoaded",
    () => {

        loadPlayer();

        createMap();

        displayQuests();

    }
);


// ======================================
// PROFIL
// ======================================

function loadPlayer() {

    const saved =
        localStorage.getItem(
            "naturequest_player"
        );


    if (saved) {

        playerData =
            JSON.parse(saved);

    }


    document.getElementById(
        "username"
    ).value =
        playerData.username;


    updateStats();

}


function saveProfile() {

    playerData.username =
        document.getElementById(
            "username"
        ).value.trim();


    savePlayer();

    alert(
        "✅ Profil enregistré !"
    );

}


function savePlayer() {

    localStorage.setItem(

        "naturequest_player",

        JSON.stringify(
            playerData
        )

    );

    updateStats();

}


function updateStats() {

    document.getElementById(
        "score"
    ).textContent =
        playerData.score;


    document.getElementById(
        "completed"
    ).textContent =
        playerData.completed.length;

}


// ======================================
// CARTE
// ======================================

function createMap() {

    map = L.map(
        "map"
    ).setView(

        [
            46.6,
            1.88
        ],

        6

    );


    L.tileLayer(

        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

        {

            attribution:
                "© OpenStreetMap contributors"

        }

    ).addTo(map);


    QUESTS.forEach(
        quest => {

            if (!quest.active)
                return;


            const marker =
                L.marker([

                    quest.latitude,

                    quest.longitude

                ]).addTo(map);


            marker.bindPopup(`

                <b>
                    ${quest.name}
                </b>

                <br>

                🏆
                ${quest.points}
                points

                <br>

                🔲
                ${quest.qr}

            `);

        }
    );

}


// ======================================
// POSITION
// ======================================

function locatePlayer() {

    if (!navigator.geolocation) {

        alert(
            "La géolocalisation n'est pas disponible."
        );

        return;

    }


    navigator.geolocation.getCurrentPosition(

        position => {

            const lat =
                position.coords.latitude;

            const lng =
                position.coords.longitude;


            map.setView(

                [
                    lat,
                    lng
                ],

                17

            );


            L.marker([
                lat,
                lng
            ])

            .addTo(map)

            .bindPopup(
                "📍 Tu es ici"
            )

            .openPopup();

        },

        () => {

            alert(
                "Impossible de récupérer ta position."
            );

        }

    );

}


// ======================================
// LISTE DES QUÊTES
// ======================================

function displayQuests() {

    const container =
        document.getElementById(
            "questList"
        );


    container.innerHTML = "";


    QUESTS.forEach(
        quest => {

            if (!quest.active)
                return;


            const completed =
                playerData.completed
                    .includes(
                        quest.id
                    );


            const div =
                document.createElement(
                    "div"
                );


            div.className =
                "quest";


            div.innerHTML = `

                <h3>
                    ${quest.name}
                </h3>

                <p>
                    ${quest.description}
                </p>

                <p>
                    🏆
                    ${quest.points}
                    points
                </p>

                <p>
                    🔲
                    ${quest.qr}
                </p>

                ${
                    completed
                    ? "✅ Terminée"
                    : "🔒 Scanne le QR"
                }

            `;


            container.appendChild(
                div
            );

        }
    );

}


// ======================================
// SCANNER
// ======================================

async function startScanner() {

    if (scanner)
        return;


    scanner =
        new Html5Qrcode(
            "reader"
        );


    try {

        await scanner.start(

            {
                facingMode:
                    "environment"
            },

            {

                fps: 10,

                qrbox: 250

            },

            qrCodeMessage => {

                openQuest(
                    qrCodeMessage.trim()
                );

                stopScanner();

            }

        );

    }

    catch (error) {

        alert(

            "❌ Impossible d'utiliser la caméra.\n\n" +

            "Vérifie que le site utilise HTTPS " +
            "et que la caméra est autorisée."

        );

        scanner = null;

    }

}


// ======================================
// ARRÊTER SCANNER
// ======================================

async function stopScanner() {

    if (!scanner)
        return;


    try {

        await scanner.stop();

    }

    catch {}

    scanner = null;

}


// ======================================
// OUVRIR QUÊTE
// ======================================

function openQuest(qrCode) {

    const quest =
        QUESTS.find(

            q =>
                q.qr.toLowerCase() ===
                qrCode.toLowerCase()

        );


    if (!quest) {

        alert(
            "❌ QR code inconnu."
        );

        return;

    }


    currentQuest =
        quest;


    document.getElementById(
        "questSection"
    )

    .classList

    .remove(
        "hidden"
    );


    document.getElementById(
        "questName"
    ).textContent =
        quest.name;


    document.getElementById(
        "questDescription"
    ).textContent =
        quest.description;


    document.getElementById(
        "questQuestion"
    ).textContent =
        quest.question;


    document.getElementById(
        "questResult"
    ).textContent = "";


    const answers =
        document.getElementById(
            "answers"
        );


    answers.innerHTML = "";


    if (
        quest.type ===
        "choice"
    ) {

        quest.options.forEach(
            option => {

                answers.innerHTML += `

                    <label class="choice">

                        <input
                            type="radio"
                            name="answer"
                            value="${option}">

                        ${option}

                    </label>

                `;

            }
        );

    }

    else {

        answers.innerHTML = `

            <textarea
                id="answerInput"
                placeholder="Écris ta réponse ici...">
            </textarea>

        `;

    }


    document.getElementById(
        "questSection"
    ).scrollIntoView({

        behavior:
            "smooth"

    });

}


// ======================================
// VALIDATION
// ======================================

function validateQuest() {

    if (!currentQuest)
        return;


    // Déjà terminée

    if (
        playerData.completed
            .includes(
                currentQuest.id
            )
    ) {

        showResult(
            "ℹ️ Tu as déjà terminé cette quête."
        );

        return;

    }


    let answer = "";


    if (
        currentQuest.type ===
        "choice"
    ) {

        const selected =
            document.querySelector(
                'input[name="answer"]:checked'
            );


        if (!selected) {

            showResult(
                "❌ Choisis une réponse."
            );

            return;

        }


        answer =
            selected.value;

    }

    else {

        answer =
            document.getElementById(
                "answerInput"
            ).value.trim();


        if (!answer) {

            showResult(
                "❌ Écris une réponse."
            );

            return;

        }

    }


    // ==================================
    // QUESTION CRÉATIVE
    // ==================================

    if (
        currentQuest.type ===
        "creative"
    ) {

        finishQuest();

        return;

    }


    // ==================================
    // RÉPONSE EXACTE
    // ==================================

    const correct =
        answer.trim().toLowerCase() ===
        currentQuest.answer
            .trim()
            .toLowerCase();


    if (correct) {

        finishQuest();

    }

    else {

        showResult(
            "❌ Mauvaise réponse. Réessaie !"
        );

    }

}


// ======================================
// TERMINER
// ======================================

function finishQuest() {

    playerData.completed.push(
        currentQuest.id
    );


    playerData.score +=
        currentQuest.points;


    savePlayer();


    showResult(

        `🎉 Bravo ! +${currentQuest.points} points !`

    );


    displayQuests();


    // Prochaine quête

    if (
        currentQuest.next
    ) {

        const next =
            QUESTS.find(

                q =>
                    q.id ===
                    currentQuest.next

            );


        if (next) {

            setTimeout(
                () => {

                    alert(

                        `🔓 Nouvelle quête débloquée !\n\n` +

                        next.name

                    );

                },

                500

            );

        }

    }

}


// ======================================
// MESSAGE
// ======================================

function showResult(
    message
) {

    document.getElementById(
        "questResult"
    ).textContent =
        message;

}
