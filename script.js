const messagesDiv = document.getElementById("messages");
let workList = [];
let currentStep = null;
let menuVisible = false; // Flag para controlar el menú principal

function sendMessage(userMessage = null, data = null) {
    if (!userMessage) {
        userMessage = document.getElementById("userMessage").value;
        document.getElementById("userMessage").value = "";
    }
    
    addMessage(userMessage, "user");
    setTimeout(() => getBotResponse(userMessage.trim().toLowerCase(), data), 500);
}


function addMessage(text, sender) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", sender);
    messageDiv.innerText = text;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function showMainMenuButton() {
    const buttonContainer = document.createElement("div");
    buttonContainer.classList.add("message", "bot");

    const mainMenuButton = document.createElement("button");
    mainMenuButton.innerText = "Volver a menú principal";
    mainMenuButton.onclick = resetChat; // Llama a resetChat cuando se presione

    buttonContainer.appendChild(mainMenuButton);
    messagesDiv.appendChild(buttonContainer);
    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Asegura que se vea el botón
}

function handleSpecialOptions(option) {
    let replyMessage = "";

    switch (option.toLowerCase()) {
        case "quiénes somos":
            replyMessage = "Somos una empresa apasionada por ofrecer soluciones innovadoras y adaptadas a las necesidades de nuestros clientes. Nuestro compromiso es la excelencia, reflejada en cada servicio que brindamos. Con un equipo altamente capacitado y enfocado en superar expectativas, nos enorgullece construir relaciones de confianza y ofrecer experiencias que marquen la diferencia. Nos define la dedicación, la calidad, y el deseo constante de crecer junto a quienes confían en nosotros.";
            break;
        case "contacto":
            replyMessage = "Estamos siempre disponibles para atender tus consultas y necesidades. Puedes comunicarte con nosotros a través de nuestro correo electrónico: contacto@empresa.com, o llamarnos directamente al número +51 123-456-789. También puedes encontrarnos en nuestras oficinas principales en Av. Principal 123, Lima, Perú. ¡Tu satisfacción es nuestra prioridad y queremos escucharte!";
            break;
        case "asistencia remota":
            replyMessage = "Con nuestra asistencia remota, puedes contar con soporte técnico y orientación sin importar dónde estés. Nuestro equipo especializado está disponible 24/7 para resolver tus dudas, problemas técnicos, o guiarte paso a paso en lo que necesites. Disfruta de una atención rápida, eficiente y personalizada desde la comodidad de tu hogar u oficina.";
            break;
        default:
            replyMessage = "Opción no reconocida.";
    }

    addMessage(replyMessage, "bot");
    disableButtons(); // Deshabilita los botones después de presionar
    showMainMenuButton(); // Muestra el botón "Volver al menú principal"
}

function disableButtons() {
    const buttons = document.querySelectorAll("button");
    buttons.forEach(button => {
        if (["Quiénes Somos", "Contacto", "Asistencia Remota"].includes(button.innerText)) {
            button.disabled = true;
            button.style.backgroundColor = "#0056b3"; // Cambia el color para reflejar el estado deshabilitado
            button.style.cursor = "not-allowed";
        }
    });
}

function addOptions(options, prefix = "", messageText = "") {
    const buttonContainer = document.createElement("div");
    buttonContainer.classList.add("message", "bot");

    if (messageText) {
        const instructionMessage = document.createElement("p");
        instructionMessage.classList.add("instruction");
        instructionMessage.innerText = messageText;
        buttonContainer.appendChild(instructionMessage);
    }

    options.forEach(option => {
        const button = document.createElement("button");
        button.innerText = option;

        if (option === "Volver a menú principal") {
            button.onclick = resetChat;
        } else if (["Quiénes Somos", "Contacto", "Asistencia Remota"].includes(option)) {
            button.onclick = () => {
                handleSpecialOptions(option); // Gestiona opciones especiales
            };
        } else {
            button.onclick = () => {
                const allButtons = buttonContainer.querySelectorAll("button");
                allButtons.forEach(btn => {
                    btn.disabled = true;
                    btn.style.backgroundColor = "#0056b3";
                    btn.style.cursor = "not-allowed";
                });
                sendMessage(`${prefix}${option}`);
            };
        }

        buttonContainer.appendChild(button);
    });

    messagesDiv.appendChild(buttonContainer);
    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Desplazamiento automático
}


let emailSentHandled = false; // Variable global para evitar duplicaciones

function getBotResponse(message, data = null) {
    console.log("Mensaje enviado al backend:", message);
    fetch("http://localhost:5000/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, data })
    })
    .then(res => {
        if (!res.ok) {
            throw new Error(`Error en la respuesta del servidor: ${res.status}`);
        }
        return res.json();
    })
    .then(data => {
        console.log("Respuesta del backend:", data);

        if (Array.isArray(data.reply)) {
            if (message === "servicios") {
                addOptions(
                    data.reply,
                    "subservicios de ",
                    "Elija un servicio para continuar:"
                );
            } else if (message.startsWith("subservicios de ")) {
                addOptions(
                    data.reply,
                    "trabajos de ",
                    "Elija un subservicio que desea explorar:"
                );
            } else if (message.startsWith("trabajos de ")) {
                addMessage("Selecciona los trabajos de tu preferencia:", "bot");
                workList = data.reply;
                showWorkCheckboxes(workList);
            }
        } else if (data.works) {
            addMessage(data.reply, "bot");
            showWorkCheckboxes(data.works);
        } else if (data.emailSent && !emailSentHandled) {
            // Solo se ejecuta si el mensaje no ha sido procesado aún
            emailSentHandled = true; // Evita duplicaciones
            console.log("Correo enviado exitosamente. Mostrando ventana emergente.");
            showSuccessModal(); // Llama al modal en lugar de agregar un mensaje al chat
            setTimeout(() => {
                showMainMenu();
                emailSentHandled = false; // Reinicia el flag para futuras interacciones
            }, 1000); // Opcional: Espera antes de mostrar el menú principal
        } else if (data.showMenu) {
            setTimeout(() => {
                showMainMenu();
            }, 100);
        } else {
            addMessage(data.reply, "bot");
        }
    })
    .catch(error => {
        console.error("Error al procesar la respuesta:", error);
        addMessage("Error al procesar la respuesta del servidor. ❌", "bot");
    });
}

function sendSelectedWorks(selectedWorks, data) {
    console.log("Datos enviados al backend:", data);
    console.log("Trabajos seleccionados:", selectedWorks);
    const message = `trabajosseleccionados:${selectedWorks.join(',')}`;
    sendMessage(message, data);

    
}
function resetChat() {
    // Limpia el historial de mensajes
    messagesDiv.innerHTML = "";

    // Reinicia las variables globales si es necesario
    workList = [];
    currentStep = null;
    emailSentHandled = false; // Asegura que todo vuelva a un estado inicial

    // Mensaje de bienvenida
    addMessage("¡Soy tu SocioBot! ", "bot");
    setTimeout(() => {
        addMessage("¿En qué puedo ayudarte? Por favor, elige una opción:", "bot");
        addOptions(["Servicios", "Quiénes Somos", "Contacto", "Asistencia Remota"]);
    }, 500);
}
function showSuccessModal() {
    // Crear el contenedor del modal
    const modal = document.createElement("div");
    modal.classList.add("modal");

    // Contenido del modal
    const modalContent = document.createElement("div");
    modalContent.classList.add("modal-content");

    // Mensaje en el modal
    const message = document.createElement("p");
    message.innerText = "¡Su solicitud ha sido registrado exitosamente!" + 
                        "\nEn breve lo contactaremos" +
                        "\nRevise su correo electrónico" // Texto del modal

    // Botón para cerrar el modal
    const closeButton = document.createElement("button");
    closeButton.classList.add("close-modal-button");
    closeButton.innerText = "Cerrar";
    closeButton.onclick = () => {
        modal.remove(); // Eliminar el modal cuando se cierra
    };

    // Ensamblar el modal
    modalContent.appendChild(message);
    modalContent.appendChild(closeButton);
    modal.appendChild(modalContent);
    document.body.appendChild(modal); // Agregarlo al body
}
function showMainMenu() {
    // Agregar un mensaje que invite al usuario a regresar al menú principal
    addMessage("Si deseas regresar al menú principal, presiona el botón a continuación.", "bot");

    // Crear un contenedor para el botón
    const buttonContainer = document.createElement("div");
    buttonContainer.classList.add("message", "bot");

    // Crear el botón "Volver a menú principal"
    const mainMenuButton = document.createElement("button");
    mainMenuButton.innerText = "Volver a menú principal";
    mainMenuButton.onclick = resetChat; // Llama a resetChat cuando se presione

    buttonContainer.appendChild(mainMenuButton);
    messagesDiv.appendChild(buttonContainer);

    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Asegurarse de mostrar el botón
}

function showWorkCheckboxes(works) {
    const checkboxContainer = document.createElement("div");
    checkboxContainer.classList.add("message", "bot");

    if (works && works.length > 0) {
        works.forEach((work, index) => {
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.id = `work-${index}`;
            checkbox.value = index; // Valor único basado en el índice

            const label = document.createElement("label");
            label.htmlFor = `work-${index}`;
            label.textContent = work.split(" - Precio: $")[0];

            checkboxContainer.appendChild(checkbox);
            checkboxContainer.appendChild(label);
            checkboxContainer.appendChild(document.createElement("br"));
        });

        const inputStyle = {
            display: "none",
            width: "100%", // Ancho completo
            height: "25px", // Altura uniforme
            fontSize: "13px", // Tamaño del texto estándar
            padding: "5px", // Espaciado interno
            marginBottom: "5px", // Separación inferior
            marginTop: "5px", // Separación superior (si aplica)
            boxSizing: "border-box" // Para evitar desbordamientos
        };

        // Campo de correo electrónico
        const emailInput = document.createElement("input");
        emailInput.type = "email";
        emailInput.id = "email";
        emailInput.placeholder = "Correo electrónico";
        emailInput.required = true;
        emailInput.style.display = "none";
        Object.assign(emailInput.style, inputStyle);

        // Campo de teléfono
        const phoneInput = document.createElement("input");
        phoneInput.type = "tel";
        phoneInput.id = "phone";
        phoneInput.placeholder = "Número de teléfono (9 dígitos)";
        phoneInput.pattern = "[0-9]{9}"; // Solo números y longitud de 9 dígitos
        phoneInput.required = true;
        phoneInput.maxLength = 9; // Longitud máxima de 9 caracteres
        Object.assign(phoneInput.style, inputStyle);

        // Validar que solo se ingresen números y que no excedan los 9 dígitos
        phoneInput.addEventListener("input", function () {
            // Eliminar caracteres no numéricos
            this.value = this.value.replace(/[^0-9]/g, "");

            // Limitar la longitud a 9 dígitos
            if (this.value.length > 9) {
                this.value = this.value.slice(0, 9); // Cortar el texto después del noveno dígito
            }
        });

        // Área de comentarios
        const commentInput = document.createElement("textarea");
        commentInput.id = "comment";
        commentInput.placeholder = "Agregar sus consideraciones";
        commentInput.style.display = "none";
        commentInput.style.width = "100%";
        commentInput.style.fontSize = "14px"; // Consistencia con los otros campos
        commentInput.style.padding = "5px"; // Espaciado interno
        commentInput.style.marginBottom = "5px";
        commentInput.style.boxSizing = "border-box";

        // Ajustar automáticamente la altura del textarea según el contenido
        commentInput.addEventListener("input", function () {
            this.style.height = "auto";
            this.style.height = this.scrollHeight + "px"; // Ajusta dinámicamente
        });

        // Campo de ubicación (solo lectura)
        const locationInput = document.createElement("input");
        locationInput.type = "text";
        locationInput.id = "location";
        locationInput.placeholder = "Seleccione su ubicación en mapa";
        locationInput.readOnly = true; // Hacer el campo de solo lectura
        Object.assign(locationInput.style, inputStyle);

        // Contenedor del mapa
        const mapContainer = document.createElement("div");
        mapContainer.id = "map";
        mapContainer.style.width = "100%";
        mapContainer.style.height = "300px";
        mapContainer.style.display = "none";
        mapContainer.style.marginBottom = "10px";

        // Botón de confirmación
        const confirmButton = document.createElement("button");
        confirmButton.textContent = "Contratar servicios";

        confirmButton.onclick = () => {
            // Captura todos los checkboxes seleccionados y verifica los índices
            const selectedWorks = Array.from(checkboxContainer.querySelectorAll('input[type="checkbox"]:checked'))
                .map(checkbox => parseInt(checkbox.value)); // Capturar índices válidos

            console.log("Índices seleccionados (frontend):", selectedWorks); // Confirmar los índices en consola

            const email = document.getElementById("email").value;
            const phone = document.getElementById("phone").value;
            const comment = document.getElementById("comment").value;

            // Verificar que se haya seleccionado una ubicación
            if (!address || !lat || !lng) {
                addMessage("Por favor, selecciona tu ubicación en el mapa.", "bot");
                return;
            }

            if (selectedWorks.length > 0 && email && phone) {
                const data = {
                    email: email,
                    phone: phone,
                    comment: comment,
                    address: address, // Usar la variable address
                    lat: lat,         // Usar la variable lat
                    lng: lng          // Usar la variable lng
                };

                sendSelectedWorks(selectedWorks, data);

                // Deshabilitar inputs y botones después de enviar
                disableInputsAfterSend();
            } else {
                addMessage("Por favor, completa todos los campos.", "bot");
            }
        };

        // Botón de cancelar
        const cancelButton = document.createElement("button");
        cancelButton.textContent = "Cancelar";
        cancelButton.onclick = resetChat;

        // Contenedor para los inputs
        const inputContainer = document.createElement("div");
        inputContainer.appendChild(emailInput);
        inputContainer.appendChild(phoneInput);
        inputContainer.appendChild(commentInput);
        inputContainer.appendChild(locationInput); // Agregar el campo de ubicación
        inputContainer.appendChild(mapContainer);

        // Agregar elementos al contenedor principal
        checkboxContainer.appendChild(inputContainer);
        checkboxContainer.appendChild(confirmButton);
        checkboxContainer.appendChild(cancelButton);

        // Agregar el contenedor al chat
        messagesDiv.appendChild(checkboxContainer);

        // Mostrar/ocultar inputs y mapa cuando se seleccionan checkboxes
        const checkboxes = checkboxContainer.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const selectedWorks = Array.from(checkboxContainer.querySelectorAll('input[type="checkbox"]:checked'))
                    .map(checkbox => parseInt(checkbox.value));

                if (selectedWorks.length > 0) {
                    emailInput.style.display = "block";
                    phoneInput.style.display = "block";
                    commentInput.style.display = "block";
                    locationInput.style.display = "block"; // Mostrar el campo de ubicación
                    mapContainer.style.display = "block";

                    // Inicializar el mapa solo si no está ya inicializado
                    if (!mapContainer.dataset.initialized) {
                        initializeMap();
                        mapContainer.dataset.initialized = "true";
                    }
                } else {
                    emailInput.style.display = "none";
                    phoneInput.style.display = "none";
                    commentInput.style.display = "none";
                    locationInput.style.display = "none"; // Ocultar el campo de ubicación
                    mapContainer.style.display = "none";
                }
            });
        });
    } else {
        addMessage("No hay trabajos disponibles para este subservicio.", "bot");
    }

    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Desplazamiento automático
}

let dataToSend = {}; // Almacena los datos antes del envío al backend

// Variables globales para almacenar la dirección y coordenadas
let address = ""; // Almacena la dirección
let lat = "";     // Almacena la latitud
let lng = "";     // Almacena la longitud

// Función para inicializar el mapa
function initializeMap() {
    const map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: -12.0464, lng: -77.0428 }, // Ubicación inicial (Lima, Perú)
        zoom: 15
    });

    const marker = new google.maps.Marker({
        map: map,
        draggable: true
    });

    const geocoder = new google.maps.Geocoder();

    // Evento: clic en el mapa para capturar ubicación
    map.addListener("click", (event) => {
        marker.setPosition(event.latLng);
        updateLocationAndCoordinates(event.latLng, geocoder);
    });

    // Evento: arrastrar y soltar el marcador
    marker.addListener("dragend", () => {
        updateLocationAndCoordinates(marker.getPosition(), geocoder);
    });
}

// Función para capturar dirección y coordenadas
let googleMapsUrl = ""; // Variable para almacenar el enlace a Google Maps

function updateLocationAndCoordinates(latlng, geocoder) {
    if (!latlng || !geocoder) {
        console.error("Faltan datos para actualizar la ubicación");
        return;
    }

    geocoder.geocode({ location: latlng }, (results, status) => {
        if (status === "OK" && results[0]) {
            address = results[0].formatted_address; // Actualizar la dirección
            lat = latlng.lat().toString();         // Actualizar la latitud
            lng = latlng.lng().toString();         // Actualizar la longitud

            // Generar el enlace a Google Maps
            googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

            // Mostrar la dirección en el campo de ubicación (solo lectura)
            const locationInput = document.getElementById("location");
            if (locationInput) {
                locationInput.value = address; // Actualizar el valor del campo
            }

            console.log("Dirección:", address);
            console.log("Latitud:", lat);
            console.log("Longitud:", lng);
            console.log("Enlace a Google Maps:", googleMapsUrl);
        } else {
            console.error("Error al obtener la dirección:", status);
            addMessage("No pudimos obtener la dirección. Por favor, intenta nuevamente.", "bot");
        }
    });
}

// Función para preparar y enviar los datos
function prepareDataAndSend() {
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const comment = document.getElementById("comment").value.trim();

    if (!email) {
        addMessage("Por favor, ingresa tu correo electrónico.", "bot");
        return;
    }
    if (!phone) {
        addMessage("Por favor, ingresa tu número de teléfono.", "bot");
        return;
    }
    if (!address || !lat || !lng) {
        addMessage("Por favor, selecciona tu ubicación.", "bot");
        return;
    }

    // Crear el objeto data con variables separadas
    const data = {
        email: email,
        phone: phone,
        comment: comment,
        address: address, // Usar la variable address
        lat: lat,         // Usar la variable lat
        lng: lng,         // Usar la variable lng
        googleMapsUrl: googleMapsUrl // Usar el enlace a Google Maps
    };

    console.log("Datos preparados para enviar:", data);

    // Enviar los datos al backend
    sendSelectedWorks([], data);
    disableInputsAfterSend();
}

function disableInputsAfterSend() {
    // Deshabilitar checkboxes
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.disabled = true;
    });

    // Deshabilitar el textarea de comentarios
    const commentInput = document.getElementById("comment");
    if (commentInput) {
        commentInput.disabled = true;
    }

    // Deshabilitar el input de ubicación
    const locationInput = document.getElementById("location");
    if (locationInput) {
        locationInput.disabled = true;
    }

    // Ocultar el mapa
    const mapContainer = document.getElementById("map");
    if (mapContainer) {
        mapContainer.style.pointerEvents = "none"; // Bloquea interacciones
        mapContainer.style.opacity = "0.5"; // Apariencia visual opcional
    }

    // Deshabilitar los inputs de correo y teléfono
    const emailInput = document.getElementById("email");
    const phoneInput = document.getElementById("phone");
    if (emailInput) {
        emailInput.disabled = true;
    }
    if (phoneInput) {
        phoneInput.disabled = true;
    }

    // Deshabilitar el botón "Contratar servicios"
    const buttons = Array.from(document.querySelectorAll("button"));
    const confirmButton = buttons.find(button => button.textContent.includes("Contratar servicios"));

    if (confirmButton) {
        confirmButton.disabled = true;
    }

    // Deshabilitar el botón "Cancelar"
    const cancelButton = buttons.find(button => button.textContent.includes("Cancelar"));
    if (cancelButton) {
        cancelButton.disabled = true;
    }
    
}

// Referencias al contenedor y textos
const carouselContainer = document.getElementById("carouselTextContainer");
const texts = document.querySelectorAll(".carousel-text");

let currentIndex = 0;

// Función para desplazar el texto
function moveText() {
    currentIndex = (currentIndex + 1) % texts.length; // Calcula el índice del próximo texto en bucle
    const offset = -currentIndex * 100; // Calcula el desplazamiento (100% por palabra)
    carouselContainer.style.transform = `translateX(${offset}%)`; // Mueve el texto
}

// Cambia el texto cada 3 segundos
if (texts.length > 0) {
    setInterval(moveText, 4000);
} else {
    console.warn("No hay textos para el carrusel.");
}



document.addEventListener("DOMContentLoaded", () => {
    resetChat();
});
