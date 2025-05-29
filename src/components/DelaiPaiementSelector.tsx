import React from "react";
import { DELAIS_PAIEMENT_OPTIONS, DelaiPaiementType, calculerDateEcheance } from "@/services/delaisPaiementService";

interface DelaiPaiementSelectorProps {
  value: DelaiPaiementType;
  onChange: (delai: DelaiPaiementType) => void;
  className?: string;
  showDescription?: boolean;
  showExample?: boolean;
}

export const DelaiPaiementSelector: React.FC<DelaiPaiementSelectorProps> = ({
  value,
  onChange,
  className = "",
  showDescription = true,
  showExample = false
}) => {
  const selectedOption = DELAIS_PAIEMENT_OPTIONS.find(opt => opt.value === value);

  // Calculer un exemple de date d'échéance pour aujourd'hui
  const exempleDate = showExample ? calculerDateEcheance(new Date(), value) : null;

  return (
    <div className="space-y-2">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as DelaiPaiementType)}
        className={`w-full p-2 border rounded-md bg-white text-black ${className}`}
      >
        {DELAIS_PAIEMENT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {showDescription && selectedOption?.description && (
        <p className="text-xs text-gray-500">
          {selectedOption.description}
        </p>
      )}

      {showExample && exempleDate && (
        <p className="text-xs text-blue-600">
          Exemple : facture émise aujourd'hui → échéance le {exempleDate.toLocaleDateString('fr-FR')}
        </p>
      )}
    </div>
  );
};

export default DelaiPaiementSelector; 