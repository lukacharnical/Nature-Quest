let amap;

let marker;

let admin = null;

let quests = [];


// ------------------------------
// DÉMARRAGE ADMIN
// ------------------------------

async function boot() {

    const {
        data: {
            user
        }
    } =
        await db.auth.getUser();


    if (!user)
        return false;


    const {
        data
    } =
        await db
            .from("profiles")
            .select(
                "role,username"
            )
            .eq(
                "id",
                user.id
            )
            .single();


    if (
        data?.role !==
        "admin"
    ) {

        return false;

    }


    admin = user;


    $("loginAdmin")
        .classList
        .add("hidden");


    $("admin")
        .classList
        .remove("hidden");


    amap =
        L.map(
            "adminMap"
        )
        .setView(
            [46.6, 1.88],
            6
        );


    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution:
                "© OpenStreetMap contributors"
        }
    ).addTo(amap);


    amap.on(
        "click",
        event => {

            setPosition(
                event.latlng.lat,
                event.latlng.lng
            );

        }
    );


    await listQuests();

    return true;

}


// ------------------------------
// POSITION
// ------------------------------

function setPosition(
    latitude,
    longitude
) {

    $("lat").value =
        latitude;

    $("lng").value =
        longitude;


    if (marker) {

        amap.removeLayer(
            marker
        );

    }


    marker =
        L.marker([
            latitude,
            longitude
        ])
        .addTo(amap);

}


// ------------------------------
// CONNEXION ADMIN
// ------------------------------

$("adminLogin").onclick =
async () => {

    const {
        error
    } =
        await db.auth
            .signInWithPassword({

                email:
                    $("ae")
                        .value
                        .trim(),

                password:
                    $("ap")
                        .value

            });


    if (error) {

        msg(
            "am",
            error.message,
            "err"
        );

        return;
    }


    const success =
        await boot();


    if (!success) {

        await db.auth.signOut();

        msg(
            "am",
            "⛔ Ce compte n'est pas administrateur.",
            "err"
        );

    }

};


// ------------------------------
// GPS
// ------------------------------

$("gps").onclick =
() => {

    if (!navigator.geolocation) {

        alert(
            "La géolocalisation n'est pas disponible."
        );

        return;

    }


    navigator.geolocation.getCurrentPosition(

        position => {

            setPosition(

                position.coords.latitude,

                position.coords.longitude

            );

        },

        () => {

            alert(
                "Impossible de récupérer ta position."
            );

        }

    );

};


// ------------------------------
// CRÉER UNE QUÊTE
// ------------------------------

$("create").onclick =
async () => {

    const type =
        $("type").value;


    const options =
        $("options")
            .value
            .split("\n")
            .map(
                x => x.trim()
            )
            .filter(Boolean);


    const row = {

        name:
            $("name")
                .value
                .trim(),

        description:
            $("desc")
                .value
                .trim(),

        question_type:
            type,

        question:
            $("question")
                .value
                .trim(),

        options:

            options,

        correct_answer:
            $("correct")
                .value
                .trim(),

        points:
            Number(
                $("points")
                    .value
            ) || 10,

        qr_code:
            $("qr")
                .value
                .trim(),

        latitude:
            Number(
                $("lat")
                    .value
            ),

        longitude:
            Number(
                $("lng")
                    .value
            ),

        active:
            true,

        created_by:
            admin.id

    };


    if (

        !row.name ||

        !row.question ||

        !row.qr_code ||

        !Number.isFinite(
            row.latitude
        ) ||

        !Number.isFinite(
            row.longitude
        )

    ) {

        msg(
            "cm",
            "❌ Certains champs sont manquants.",
            "err"
        );

        return;

    }


    const {
        error
    } =
        await db
            .from("quests")
            .insert(row);


    if (error) {

        msg(
            "cm",
            error.message,
            "err"
        );

        return;

    }


    msg(
        "cm",
        "✅ Quête publiée !",
        "ok"
    );


    await listQuests();

};


// ------------------------------
// GÉNÉRATEUR QR
// ------------------------------

$("genQr").onclick =
() => {

    const value =
        $("qrValue")
            .value
            .trim();


    if (!value) {

        alert(
            "Entre un identifiant QR."
        );

        return;

    }


    $("qrOut")
        .innerHTML = "";


    new QRCode(
        $("qrOut"),
        {

            text:
                value,

            width:
                280,

            height:
                280,

            correctLevel:
                QRCode.CorrectLevel.H

        }
    );

};


// ------------------------------
// LISTE DES QUÊTES
// ------------------------------

async function listQuests() {

    const {
        data,
        error
    } =
        await db
            .from("quests")
            .select("*")
            .order(
                "created_at",
                {
                    ascending:
                        false
                }
            );


    if (error) {

        msg(
            "cm",
            error.message,
            "err"
        );

        return;

    }


    quests =
        data || [];


    $("list").innerHTML =
        quests
            .map(q => `

                <div class="quest">

                    <b>
                        ${esc(q.name)}
                    </b>

                    —

                    ${q.points}
                    points

                    <br>

                    🔲
                    ${esc(q.qr_code)}

                    <br>

                    📍
                    ${q.latitude.toFixed(5)},
                    ${q.longitude.toFixed(5)}

                    <br>

                    <button
                        onclick="toggleQuest(
                            '${q.id}',
                            ${q.active}
                        )">

                        ${
                            q.active
                            ? "Désactiver"
                            : "Activer"
                        }

                    </button>

                    <button
                        class="danger"
                        onclick="deleteQuest(
                            '${q.id}'
                        )">

                        Supprimer

                    </button>

                </div>

            `)
            .join("");


    if (amap) {

        quests.forEach(q => {

            L.marker([
                q.latitude,
                q.longitude
            ])

            .addTo(amap)

            .bindPopup(
                esc(q.name)
            );

        });

    }

}


// ------------------------------
// ACTIVER / DÉSACTIVER
// ------------------------------

async function toggleQuest(
    id,
    active
) {

    await db
        .from("quests")
        .update({
            active:
                !active
        })
        .eq(
            "id",
            id
        );


    await listQuests();

}


// ------------------------------
// SUPPRIMER
// ------------------------------

async function deleteQuest(
    id
) {

    if (
        !confirm(
            "Supprimer cette quête ?"
        )
    )
        return;


    await db
        .from("quests")
        .delete()
        .eq(
            "id",
            id
        );


    await listQuests();

}


// ------------------------------
// DÉMARRAGE
// ------------------------------

(async () => {

    const {
        data
    } =
        await db.auth
            .getSession();


    if (
        data.session
    ) {

        await boot();

    }

})();