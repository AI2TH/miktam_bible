const text = "For the law was given through Moses; <b>grace</b> and</S...";
const cleaned = text
  .replace(/<S>\d+<\/S>/gi, '')
  .replace(/<S>\d+/gi, '')
  .replace(/\d+<\/S>/gi, '')
  .replace(/<\/?[Ss]\b>?/gi, '') // updated to match partial tags like </S or <S with or without >
  .replace(/<sup[^>]*>.*?<\/sup>/gi, '')
  .replace(/\s+/g, ' ')
  .trim();

console.log("Cleaned:", cleaned);
