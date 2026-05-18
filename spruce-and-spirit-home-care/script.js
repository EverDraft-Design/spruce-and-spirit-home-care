document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.querySelector(".menu-toggle");
  const primaryNav = document.querySelector(".primary-nav");
  const navLinks = document.querySelectorAll(".primary-nav a");
  const contactForm = document.querySelector(".contact-form");
  const formNote = document.querySelector(".form-note");
  const submitButton = document.querySelector(".form-button");

  function setMenu(open) {
    menuToggle?.setAttribute("aria-expanded", String(open));
    primaryNav?.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
  }

  function setFormMessage(message, type = "") {
    if (!formNote) return;

    formNote.textContent = message;
    formNote.classList.toggle("is-success", type === "success");
    formNote.classList.toggle("is-error", type === "error");
  }

  menuToggle?.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    setMenu(!isOpen);
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => setMenu(false));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setMenu(false);
    }
  });

  contactForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!contactForm.checkValidity()) {
      contactForm.reportValidity();
      setFormMessage("Please complete the required fields before sending.", "error");
      return;
    }

    const formData = new FormData(contactForm);
    const payload = Object.fromEntries(formData.entries());

    submitButton?.setAttribute("disabled", "true");
    setFormMessage("Sending your enquiry...");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "Unable to send enquiry.");
      }

      contactForm.reset();
      setFormMessage("Thanks for your enquiry. We will be in touch soon.", "success");
    } catch (error) {
      setFormMessage("Sorry, something went wrong while sending your enquiry. Please try again.", "error");
    } finally {
      submitButton?.removeAttribute("disabled");
    }
  });
});
