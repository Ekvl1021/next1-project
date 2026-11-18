"use client";

import { useState } from "react";

export default function Welcome() {
  const [name, setName] = useState("");

  return (
    <section className="welcome-widget">
      <h2>Тавтай морил</h2>
      <label htmlFor="welcome-name">Нэрээ оруулна уу</label>
      <input
        id="welcome-name"
        className="welcome-input"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Нэрээ оруулна уу"
      />
      <p className="welcome-greeting">{name ? `Сайн байна уу, ${name}!` : "Нэрээ бичихэд мэндчилгээ энд гарна."}</p>
    </section>
  );
}
