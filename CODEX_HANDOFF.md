# Codex Handoff

Project path: `C:\Users\Boss\Desktop\projects\loser`

## Project Summary

Το project είναι Next.js 16 app με Supabase και Tesseract OCR.

Η βασική ιδέα είναι ένα OCR Bet Ticket Tracker:

- Οι χρήστες κάνουν register/login με Supabase Auth.
- Μπορούν να ανεβάζουν φωτογραφίες δελτίων.
- Το app τρέχει OCR με `tesseract.js`.
- Προσπαθεί να διαβάσει αριθμό αγώνων και συνολική απόδοση.
- Ανεβάζει την εικόνα στο Supabase Storage bucket `tickets_images`.
- Αποθηκεύει εγγραφή στον πίνακα `tickets`.
- Το `/dashboard` δείχνει όλα τα δελτία σε όλους τους authenticated χρήστες. Αυτό είναι σωστό product requirement και δεν πρέπει να αλλάξει.
- Το `/my-tickets` δείχνει μόνο τα δελτία του τρέχοντος χρήστη.
- Το `/admin` επιτρέπει σε admin users να επεξεργάζονται/διαγράφουν δελτία.

## Important Product Decision

ΜΗΝ αλλάξεις το dashboard ώστε να δείχνει μόνο τα δελτία του χρήστη.

Το σωστό behavior είναι:

```ts
.from('tickets')
.select('*')
