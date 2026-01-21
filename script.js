const fields = [
    "nom","classe","niveau","race","alignement","background",
    "pvMax","pvActuels","ca","initiative","vitesse",
    "force","dex","con","int","sag","cha",
    "jsForce","jsDex","jsCon","jsInt","jsSag","jsCha",
    "perceptionPassive","investigationPassive","perspicacitePassive",
    "attaques","inventaire","traits"
];

let editMode = false;

// Charger les données
function loadData() {
    fields.forEach(id => {
        const saved = localStorage.getItem(id) || "";
        const input = document.getElementById(id);
        const display = document.getElementById(id + "Display");

        if (!input || !display) return;

        input.value = saved;
        display.textContent = saved || "—";
    });
}

// Sauvegarder
function saveData() {
    fields.forEach(id => {
        const input = document.getElementById(id);
        const display = document.getElementById(id + "Display");
        if (!input || !display) return;

        const value = input.value;
        localStorage.setItem(id, value);
        display.textContent = value || "—";
    });
}

// Toggle édition
document.getElementById("editBtn").addEventListener("click", () => {
    editMode = !editMode;

    document.querySelectorAll(".editField").forEach(input => {
        input.style.display = editMode ? "block" : "none";
    });

    document.querySelectorAll(".value").forEach(span => {
        span.style.display = editMode ? "none" : "block";
    });

    const btn = document.getElementById("editBtn");
    btn.textContent = editMode ? "Sauvegarder" : "Modifier";

    if (!editMode) {
        saveData();
    }
});

loadData();