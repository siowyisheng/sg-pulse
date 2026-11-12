"use client";

import { useState } from "react";
import { Button } from "@/ui/buttons";
import { Modal } from "@/ui/modal";

export function ModalExample() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        Open a modal
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="A modal">
        <p>Body text in a modal.</p>
        <p className="caption muted">Caption and metadata.</p>
        <div className="gallery-row">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </Modal>
    </>
  );
}
