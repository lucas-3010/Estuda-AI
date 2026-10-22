import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ThemeToggle } from "@/components/ThemeToggle";
import { THEME_KEY } from "@/lib/theme";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
});

describe("Botão de tema", () => {
  test("alterna claro → escuro → automático → oposto do sistema e guarda a escolha", async () => {
    localStorage.setItem(THEME_KEY, "claro");
    const user = userEvent.setup();
    render(<ThemeToggle />);
    const button = screen.getByRole("button", { name: /aparência: claro/i });

    await user.click(button);
    expect(localStorage.getItem(THEME_KEY)).toBe("escuro");
    expect(document.documentElement).toHaveClass("dark");
    expect(screen.getByRole("button", { name: /aparência: escuro/i })).toBeInTheDocument();

    await user.click(button);
    expect(localStorage.getItem(THEME_KEY)).toBe("sistema");
    expect(document.documentElement).not.toHaveClass("dark");

    // Sistema claro: do automático vai para o escuro
    await user.click(button);
    expect(localStorage.getItem(THEME_KEY)).toBe("escuro");
  });
});
