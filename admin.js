function generateQuest() {

    const id =
        document.getElementById(
            "id"
        ).value.trim();


    const qr =
        document.getElementById(
            "qr"
        ).value.trim();


    const name =
        document.getElementById(
            "name"
        ).value.trim();


    const description =
        document.getElementById(
            "description"
        ).value.trim();


    const question =
        document.getElementById(
            "question"
        ).value.trim();


    const type =
        document.getElementById(
            "type"
        ).value;


    const answer =
        document.getElementById(
            "answer"
        ).value.trim();


    const points =
        Number(
            document.getElementById(
                "points"
            ).value
        ) || 10;


    const latitude =
        Number(
            document.getElementById(
                "latitude"
            ).value
        );


    const longitude =
        Number(
            document.getElementById(
                "longitude"
            ).value
        );


    const next =
        document.getElementById(
            "next"
        ).value.trim();


    const active =
        document.getElementById(
            "active"
        ).checked;


    const options =
        document.getElementById(
            "options"
        )

        .value

        .split("\n")

        .map(
            x => x.trim()
        )

        .filter(Boolean);


    if (
        !id ||
        !qr ||
        !name ||
        !question
    ) {

        alert(
            "❌ Remplis au minimum l'ID, le QR, le nom et la question."
        );

        return;

    }


    const quest = {

        id,

        qr,

        name,

        description,

        question,

        type,

        answer,

        points,

        latitude,

        longitude,

        next:
            next || null,

        active

    };


    const code = `

    {
        id: "${escapeJS(quest.id)}",

        qr: "${escapeJS(quest.qr)}",

        name: "${escapeJS(quest.name)}",

        description:
            "${escapeJS(quest.description)}",

        question:
            "${escapeJS(quest.question)}",

        type:
            "${escapeJS(quest.type)}",

        answer:
            "${escapeJS(quest.answer)}",

        points:
            ${quest.points},

        latitude:
            ${quest.latitude},

        longitude:
            ${quest.longitude},

        next:
            ${quest.next
                ? `"${escapeJS(quest.next)}"`
                : "null"},

        active:
            ${quest.active}

    },

`;


    document.getElementById(
        "output"
    ).value =
        code;

}


function escapeJS(
    value
) {

    return String(value)
        .replace(
            /\\/g,
            "\\\\"
        )

        .replace(
            /"/g,
            '\\"'
        )

        .replace(
            /\n/g,
            "\\n"
        );

}


function copyCode() {

    const output =
        document.getElementById(
            "output"
        );


    output.select();

    output.setSelectionRange(
        0,
        99999
    );


    navigator.clipboard
        .writeText(
            output.value
        )

        .then(
            () => {

                alert(
                    "✅ Code copié !"
                );

            }
        );

}


function generateQR() {

    const value =
        document.getElementById(
            "qrGenerator"
        ).value.trim();


    if (!value) {

        alert(
            "Entre un code QR."
        );

        return;

    }


    const result =
        document.getElementById(
            "qrResult"
        );


    result.innerHTML = "";


    new QRCode(
        result,
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

}
