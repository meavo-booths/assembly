import { QuestionnaireLocale } from "@prisma/client";

export type QuestionnaireUiCopy = {
  step: (current: number, total: number) => string;
  back: string;
  next: string;
  finish: string;
  finishPreview: string;
  yes: string;
  no: string;
  followUpPlaceholder: string;
  photosTitle: string;
  photosDescription: string;
  photosAddMore: string;
  submitting: string;
  submit: string;
  completePreview: string;
  photosDisabledPreview: string;
  previewCompleteTitle: string;
  previewCompleteBody: string;
  startOver: string;
  submittedTitle: string;
  submittedBody: string;
  noSectionsPartner: string;
  noSectionsPreview: string;
  noSteps: string;
  previewBanner: string;
  languageLabel: string;
};

const EN: QuestionnaireUiCopy = {
  step: (current, total) => `Step ${current} of ${total}`,
  back: "Back",
  next: "Next",
  finish: "Finish",
  finishPreview: "Finish preview",
  yes: "Yes",
  no: "No",
  followUpPlaceholder: "Describe the issues…",
  photosTitle: "Installation photos",
  photosDescription:
    "Attach photos of the completed assembly (booth exterior, interior, and any issues).",
  photosAddMore: "You can add more photos before submitting.",
  submitting: "Submitting…",
  submit: "Submit",
  completePreview: "Complete preview",
  photosDisabledPreview: "Photo upload is disabled in preview mode.",
  previewCompleteTitle: "Preview complete",
  previewCompleteBody:
    "You reached the end of the questionnaire. Nothing was saved — this is a test run only.",
  startOver: "Start over",
  submittedTitle: "Questionnaire submitted",
  submittedBody: "Thank you. MEAVO has received your install checklist.",
  noSectionsPartner: "No questionnaire has been published yet.",
  noSectionsPreview:
    "No sections in the questionnaire yet. Add sections on the builder page, then preview again.",
  noSteps: "No steps available for this questionnaire.",
  previewBanner: "Preview mode — answers and photos are not saved.",
  languageLabel: "Language",
};

const DE: QuestionnaireUiCopy = {
  ...EN,
  step: (current, total) => `Schritt ${current} von ${total}`,
  back: "Zurück",
  next: "Weiter",
  finish: "Abschließen",
  finishPreview: "Vorschau abschließen",
  yes: "Ja",
  no: "Nein",
  followUpPlaceholder: "Beschreiben Sie die Probleme…",
  photosTitle: "Installationsfotos",
  photosDescription:
    "Fügen Sie Fotos der abgeschlossenen Montage hinzu (Außenansicht, Innenraum und eventuelle Probleme).",
  photosAddMore: "Sie können vor dem Absenden weitere Fotos hinzufügen.",
  submitting: "Wird gesendet…",
  submit: "Absenden",
  completePreview: "Vorschau abschließen",
  photosDisabledPreview: "Foto-Upload ist im Vorschaumodus deaktiviert.",
  previewCompleteTitle: "Vorschau abgeschlossen",
  previewCompleteBody:
    "Sie haben das Ende des Fragebogens erreicht. Es wurde nichts gespeichert — dies ist nur ein Testlauf.",
  startOver: "Neu starten",
  submittedTitle: "Fragebogen eingereicht",
  submittedBody: "Vielen Dank. MEAVO hat Ihre Installations-Checkliste erhalten.",
  noSectionsPartner: "Es wurde noch kein Fragebogen veröffentlicht.",
  noSectionsPreview:
    "Noch keine Abschnitte im Fragebogen. Fügen Sie Abschnitte auf der Builder-Seite hinzu und starten Sie die Vorschau erneut.",
  noSteps: "Für diesen Fragebogen sind keine Schritte verfügbar.",
  previewBanner: "Vorschaumodus — Antworten und Fotos werden nicht gespeichert.",
  languageLabel: "Sprache",
};

const FR: QuestionnaireUiCopy = {
  ...EN,
  step: (current, total) => `Étape ${current} sur ${total}`,
  back: "Retour",
  next: "Suivant",
  finish: "Terminer",
  finishPreview: "Terminer l’aperçu",
  yes: "Oui",
  no: "Non",
  followUpPlaceholder: "Décrivez les problèmes…",
  photosTitle: "Photos d’installation",
  photosDescription:
    "Joignez des photos de l’assemblage terminé (extérieur, intérieur et problèmes éventuels).",
  photosAddMore: "Vous pouvez ajouter d’autres photos avant d’envoyer.",
  submitting: "Envoi en cours…",
  submit: "Envoyer",
  completePreview: "Terminer l’aperçu",
  photosDisabledPreview: "Le téléversement de photos est désactivé en mode aperçu.",
  previewCompleteTitle: "Aperçu terminé",
  previewCompleteBody:
    "Vous avez atteint la fin du questionnaire. Rien n’a été enregistré — il s’agit d’un test uniquement.",
  startOver: "Recommencer",
  submittedTitle: "Questionnaire envoyé",
  submittedBody: "Merci. MEAVO a reçu votre liste de contrôle d’installation.",
  noSectionsPartner: "Aucun questionnaire n’a encore été publié.",
  noSectionsPreview:
    "Aucune section dans le questionnaire. Ajoutez des sections sur la page de configuration, puis relancez l’aperçu.",
  noSteps: "Aucune étape disponible pour ce questionnaire.",
  previewBanner: "Mode aperçu — les réponses et les photos ne sont pas enregistrées.",
  languageLabel: "Langue",
};

const ES: QuestionnaireUiCopy = {
  ...EN,
  step: (current, total) => `Paso ${current} de ${total}`,
  back: "Atrás",
  next: "Siguiente",
  finish: "Finalizar",
  finishPreview: "Finalizar vista previa",
  yes: "Sí",
  no: "No",
  followUpPlaceholder: "Describa los problemas…",
  photosTitle: "Fotos de instalación",
  photosDescription:
    "Adjunte fotos del montaje completado (exterior, interior y cualquier problema).",
  photosAddMore: "Puede añadir más fotos antes de enviar.",
  submitting: "Enviando…",
  submit: "Enviar",
  completePreview: "Completar vista previa",
  photosDisabledPreview: "La carga de fotos está desactivada en modo de vista previa.",
  previewCompleteTitle: "Vista previa completada",
  previewCompleteBody:
    "Ha llegado al final del cuestionario. No se ha guardado nada — esto es solo una prueba.",
  startOver: "Empezar de nuevo",
  submittedTitle: "Cuestionario enviado",
  submittedBody: "Gracias. MEAVO ha recibido su lista de verificación de instalación.",
  noSectionsPartner: "Aún no se ha publicado ningún cuestionario.",
  noSectionsPreview:
    "Aún no hay secciones en el cuestionario. Añada secciones en la página de configuración y vuelva a previsualizar.",
  noSteps: "No hay pasos disponibles para este cuestionario.",
  previewBanner: "Modo vista previa — las respuestas y las fotos no se guardan.",
  languageLabel: "Idioma",
};

const IT: QuestionnaireUiCopy = {
  ...EN,
  step: (current, total) => `Passaggio ${current} di ${total}`,
  back: "Indietro",
  next: "Avanti",
  finish: "Fine",
  finishPreview: "Termina anteprima",
  yes: "Sì",
  no: "No",
  followUpPlaceholder: "Descrivi i problemi…",
  photosTitle: "Foto di installazione",
  photosDescription:
    "Allega foto del montaggio completato (esterno, interno ed eventuali problemi).",
  photosAddMore: "Puoi aggiungere altre foto prima di inviare.",
  submitting: "Invio in corso…",
  submit: "Invia",
  completePreview: "Completa anteprima",
  photosDisabledPreview: "Il caricamento delle foto è disabilitato in modalità anteprima.",
  previewCompleteTitle: "Anteprima completata",
  previewCompleteBody:
    "Hai raggiunto la fine del questionario. Nulla è stato salvato — si tratta solo di una prova.",
  startOver: "Ricomincia",
  submittedTitle: "Questionario inviato",
  submittedBody: "Grazie. MEAVO ha ricevuto la tua checklist di installazione.",
  noSectionsPartner: "Nessun questionario è stato ancora pubblicato.",
  noSectionsPreview:
    "Non ci sono ancora sezioni nel questionario. Aggiungi sezioni nella pagina di configurazione e ripeti l’anteprima.",
  noSteps: "Nessun passaggio disponibile per questo questionario.",
  previewBanner: "Modalità anteprima — risposte e foto non vengono salvate.",
  languageLabel: "Lingua",
};

const COPY: Record<QuestionnaireLocale, QuestionnaireUiCopy> = {
  [QuestionnaireLocale.EN]: EN,
  [QuestionnaireLocale.DE]: DE,
  [QuestionnaireLocale.FR]: FR,
  [QuestionnaireLocale.ES]: ES,
  [QuestionnaireLocale.IT]: IT,
};

export function getQuestionnaireUiCopy(locale: QuestionnaireLocale): QuestionnaireUiCopy {
  return COPY[locale] ?? EN;
}
