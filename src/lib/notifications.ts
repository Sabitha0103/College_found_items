export type FoundItemForEmail = {
  title: string;
  category: string;
  description?: string | null;
  location?: string | null;
};

export function composeFoundMatchEmail(found: FoundItemForEmail) {
  const subject = `New found item in ${found.category} may match your lost item`;
  const lines: string[] = [
    `Someone just reported a found item in the ${found.category} category.`,
    `Title: ${found.title}`,
  ];
  if (found.description) lines.push(`Description: ${found.description}`);
  if (found.location) lines.push(`Location: ${found.location}`);
  const html = `
    <div style="font-family: Arial, sans-serif; line-height:1.5;">
      <h2>Possible match for your lost item</h2>
      <p>${lines[0]}</p>
      <ul>
        ${lines.slice(1).map((l) => `<li>${l}</li>`).join("")}
      </ul>
      <p>Visit the app to review details and contact the finder.</p>
    </div>
  `;
  return { subject, html };
}
