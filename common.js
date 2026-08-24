const db = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);


const $ = id =>
    document.getElementById(id);


const esc = value =>
    String(value ?? "")
        .replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[character]));


const msg = (
    id,
    text,
    className = ""
) => {

    $(id).textContent = text;

    $(id).className = className;

};