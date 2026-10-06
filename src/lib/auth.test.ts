import { afterEach, describe, expect, it } from "vitest";
import {
  areValidCredentials,
  DEFAULT_APP_USERNAME,
  expectedSessionToken,
  expectedUsername,
  isValidExportToken,
  MIN_EXPORT_TOKEN_LENGTH,
} from "./auth";

const originalUsername = process.env.APP_USERNAME;
const originalPassword = process.env.APP_PASSWORD;

afterEach(() => {
  if (originalUsername === undefined) delete process.env.APP_USERNAME;
  else process.env.APP_USERNAME = originalUsername;

  if (originalPassword === undefined) delete process.env.APP_PASSWORD;
  else process.env.APP_PASSWORD = originalPassword;
});

describe("autenticación", () => {
  it("usa el usuario inicial cuando APP_USERNAME no está configurado", () => {
    delete process.env.APP_USERNAME;
    expect(expectedUsername()).toBe(DEFAULT_APP_USERNAME);
  });

  it("exige que coincidan tanto el usuario como la contraseña", () => {
    process.env.APP_USERNAME = "juanma";
    process.env.APP_PASSWORD = "secreto";

    expect(areValidCredentials("juanma", "secreto")).toBe(true);
    expect(areValidCredentials("otro", "secreto")).toBe(false);
    expect(areValidCredentials("juanma", "incorrecta")).toBe(false);
  });

  it("invalida la sesión si cambia el usuario", () => {
    process.env.APP_USERNAME = "juanma";
    process.env.APP_PASSWORD = "secreto";
    const firstToken = expectedSessionToken();

    process.env.APP_USERNAME = "otro";
    expect(expectedSessionToken()).not.toBe(firstToken);
  });
});

describe("token de exportación", () => {
  const originalToken = process.env.EXPORT_TOKEN;
  afterEach(() => {
    if (originalToken === undefined) delete process.env.EXPORT_TOKEN;
    else process.env.EXPORT_TOKEN = originalToken;
  });

  it("queda deshabilitado sin EXPORT_TOKEN o con uno corto", () => {
    delete process.env.EXPORT_TOKEN;
    expect(isValidExportToken("Bearer cualquiera")).toBe(false);
    process.env.EXPORT_TOKEN = "corto";
    expect(isValidExportToken("Bearer corto")).toBe(false);
  });

  it("acepta solo el Bearer exacto", () => {
    const token = "a".repeat(MIN_EXPORT_TOKEN_LENGTH);
    process.env.EXPORT_TOKEN = token;
    expect(isValidExportToken(`Bearer ${token}`)).toBe(true);
    expect(isValidExportToken(`bearer ${token}`)).toBe(true);
    expect(isValidExportToken(token)).toBe(false);
    expect(isValidExportToken(`Bearer ${token}b`)).toBe(false);
    expect(isValidExportToken(null)).toBe(false);
  });
});
