"use client";

import { ChangeEvent } from "react";

type Detector = {
  treshold: number;
  time: number;
  blockTime: number;
};

interface DetectorEditorProps {
  detKey: string;
  detector: Detector;
  onChange: (field: keyof Detector, value: number) => void;
  onReset: () => void;
}

interface DetectorEditorProps {
  detKey: string;
  detector: Detector;
  onChange: (field: keyof Detector, value: number) => void;
  onReset: () => void;
}

export default function DetectorEditor({
  detKey,
  detector,
  onChange,
  onReset,
}: DetectorEditorProps) {
  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-lg capitalize">{detKey}</h4>
        <button
          onClick={onReset}
          className="text-sm px-2 py-1 bg-neutral-700 rounded hover:bg-neutral-600"
        >
          Reset
        </button>
      </div>
      <div className="grid  grid-cols-1 gap-3">
        {(["treshold", "time", "blockTime"] as (keyof Detector)[]).map(
          (field) => (
            <div key={field}>
              <label className="text-sm text-gray-300">{field}</label>
              <input
                type="number"
                min={0}
                value={detector[field]}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  onChange(field, Number(e.target.value))
                }
                className="w-full bg-neutral-900 border border-neutral-700 p-2 rounded text-white"
              />
            </div>
          ),
        )}
      </div>
    </div>
  );
}
