import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Markdown } from "@/components/Markdown";

describe("<Markdown>", () => {
  test("realça blocos de código", () => {
    const { container } = render(<Markdown source={"```sql\nSELECT * FROM cards;\n```"} />);
    const code = container.querySelector("pre code");
    expect(code).not.toBeNull();
    expect(code!.className).toContain("hljs");
    expect(code!.className).toContain("language-sql");
  });

  test("remove HTML perigoso", () => {
    const { container } = render(
      <Markdown source={'Olá <script>alert("x")</script><img src=x onerror="alert(1)">'} />,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.innerHTML).not.toContain("onerror");
  });

  test("renderiza ênfase e listas", () => {
    const { container } = render(<Markdown source={"**negrito**\n\n- um\n- dois"} />);
    expect(container.querySelector("strong")?.textContent).toBe("negrito");
    expect(container.querySelectorAll("li")).toHaveLength(2);
  });
});
