let user = null;

let quests = [];

let current = null;

let scanner = null;


// ------------------------------
// CARTE
// ------------------------------

const map = L.map("map")
    .setView([46.6, 1.88], 6);


L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        attribution:
            "© OpenStreetMap contributors"
    }
).addTo(map);


// ------------------------------
// CHARGEMENT DES QUÊTES
// ------------------------------

async function loadQuests() {

    const {
        data,
        error
    } = await db
        .from("quests")
        .select("*")
        .eq("active", true);


    if (error) {

        msg(
            "msg",
            error.message,
            "err"
        );

        return;
    }


    quests = data || [];


    $("quests").innerHTML =
        quests.map(q => `

            <div class="quest">

                <b>
                    ${esc(q.name)}
                </b>

                <br>

                ${esc(q.description)}

                <br>

                🏆 ${q.points} points

                <br>

                🔲 ${esc(q.qr_code)}

            </div>

        `).join("");


    quests.forEach(q => {

        L.marker([
            q.latitude,
            q.longitude
        ])

        .addTo(map)

        .bindPopup(`

            <b>
                ${esc(q.name)}
            </b>

            <br>

            ${q.points} points

        `);

    });

}


// ------------------------------
// SESSION
// ------------------------------

async function session() {

    const {
        data
    } = await db.auth.getSession();


    user =
        data.session?.user || null;


    $("auth")
        .classList
        .toggle(
            "hidden",
            !!user
        );


    $("profile")
        .classList
        .toggle(
            "hidden",
            !user
        );


    if (!user)
        return;


    const {
        data: profile
    } = await db
        .from("profiles")
        .select(
            "username,points"
        )
        .eq(
            "id",
            user.id
        )
        .single();


    if (profile) {

        $("name").textContent =
            "👤 " +
            profile.username;

        $("points").textContent =
            profile.points;

    }

}


// ------------------------------
// INSCRIPTION
// ------------------------------

$("signup").onclick =
async () => {

    const username =
        $("suName")
            .value
            .trim();

    const email =
        $("suEmail")
            .value
            .trim();

    const password =
        $("suPass")
            .value;


    if (
        !username ||
        !email ||
        password.length < 6
    ) {

        msg(
            "msg",
            "Remplis tous les champs. Le mot de passe doit contenir au moins 6 caractères.",
            "err"
        );

        return;
    }


    const {
        error
    } =
        await db.auth.signUp({

            email,

            password,

            options: {

                data: {
                    username
                }

            }

        });


    msg(
        "msg",

        error
            ? error.message
            : "✅ Compte créé ! Vérifie ton e-mail si Supabase demande une confirmation.",

        error
            ? "err"
            : "ok"
    );

};


// ------------------------------
// CONNEXION
// ------------------------------

$("login").onclick =
async () => {

    const {
        error
    } =
        await db.auth
            .signInWithPassword({

                email:
                    $("liEmail")
                        .value
                        .trim(),

                password:
                    $("liPass")
                        .value

            });


    msg(
        "msg",

        error
            ? error.message
            : "✅ Connexion réussie !",

        error
            ? "err"
            : "ok"
    );


    await session();

};


// ------------------------------
// DÉCONNEXION
// ------------------------------

$("logout").onclick =
async () => {

    await db.auth.signOut();

    await session();

};


// ------------------------------
// SCANNER QR
// ------------------------------

$("scan").onclick =
async () => {

    $("scanner")
        .classList
        .remove("hidden");


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

            async code => {

                await scanner.stop();

                scanner = null;

                $("scanner")
                    .classList
                    .add("hidden");

                openQuest(
                    code.trim()
                );

            }

        );

    }

    catch (error) {

        msg(
            "msg",
            "Impossible d'utiliser la caméra. Vérifie l'autorisation et utilise HTTPS.",
            "err"
        );

    }

};


// ------------------------------
// FERMER SCANNER
// ------------------------------

$("closeScan").onclick =
async () => {

    if (scanner) {

        try {
            await scanner.stop();
        }

        catch {}

        scanner = null;

    }


    $("scanner")
        .classList
        .add("hidden");

};


// ------------------------------
// OUVRIR UNE QUÊTE
// ------------------------------

async function openQuest(code) {

    const {
        data,
        error
    } = await db
        .from("quests")
        .select("*")
        .eq(
            "qr_code",
            code
        )
        .eq(
            "active",
            true
        )
        .single();


    if (
        error ||
        !data
    ) {

        alert(
            "❌ Ce QR code ne correspond à aucune quête."
        );

        return;
    }


    current = data;


    $("quest")
        .classList
        .remove("hidden");


    $("qName")
        .textContent =
        data.name;


    $("qDesc")
        .textContent =
        data.description;


    $("qQuestion")
        .textContent =
        data.question;


    $("result")
        .textContent = "";


    if (
        data.question_type ===
        "choice"
    ) {

        $("answer").innerHTML =
            (data.options || [])
                .map(option => `

                    <label class="choice">

                        <input
                            type="radio"
                            name="choice"
                            value="${esc(option)}">

                        ${esc(option)}

                    </label>

                `)
                .join("");

    }

    else {

        $("answer").innerHTML = `

            <textarea
                id="answerInput"
                placeholder="Écris ta réponse">
            </textarea>

        `;

    }

}


// ------------------------------
// VALIDATION
// ------------------------------

$("validate").onclick =
async () => {

    if (!user) {

        msg(
            "result",
            "🔐 Connecte-toi pour répondre.",
            "err"
        );

        return;
    }


    let answer;


    if (
        current.question_type ===
        "choice"
    ) {

        answer =
            document.querySelector(
                'input[name="choice"]:checked'
            )?.value;

    }

    else {

        answer =
            $("answerInput")
                ?.value
                .trim();

    }


    if (!answer) {

        msg(
            "result",
            "❌ Tu dois donner une réponse.",
            "err"
        );

        return;
    }


    const {
        data,
        error
    } =
        await db.rpc(
            "submit_quest_answer",
            {
                p_quest_id:
                    current.id,

                p_answer:
                    answer
            }
        );


    if (error) {

        msg(
            "result",
            error.message,
            "err"
        );

        return;
    }


    const result =
        data?.[0] || data;


    if (result.correct) {

        msg(
            "result",

            `🎉 Bravo ! +${result.points_awarded} points`,

            "ok"
        );

    }

    else {

        msg(
            "result",
            "❌ Mauvaise réponse.",
            "err"
        );

    }


    await session();

};


// ------------------------------
// DÉMARRAGE
// ------------------------------

db.auth.onAuthStateChange(
    () => {

        setTimeout(
            session,
            0
        );

    }
);


loadQuests();

session();