"use client";

import { FormEvent, useState } from "react";

type ApiResponse = {
  ok: boolean;
  id?: number;
  error?: string;
};

export function TestForm() {
  const [dato, setDato] = useState("");
  const [mensaje, setMensaje] = useState("");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMensaje("Guardando...");

    const response = await fetch("/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dato })
    });

    const data = (await response.json()) as ApiResponse;

    if (!response.ok || !data.ok) {
      setMensaje(data.error ?? "No se pudo guardar");
      return;
    }

    setMensaje(`Guardado con id ${data.id}`);
    setDato("");
  };

  return (
    <form onSubmit={onSubmit}>
      <label htmlFor="dato">Dato</label>
      <input
        id="dato"
        name="dato"
        value={dato}
        onChange={(event) => setDato(event.target.value)}
        required
      />
      <button type="submit">Guardar</button>
      {mensaje ? <p>{mensaje}</p> : null}
    </form>
  );
}
