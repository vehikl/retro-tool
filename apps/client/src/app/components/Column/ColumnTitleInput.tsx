import { Input } from "@chakra-ui/react";
import React from "react";

interface ColumnTitleInputProps {
  defaultValue: string
  onBlur: (value: string) => void
}

export const ColumnTitleInput: React.FC<ColumnTitleInputProps> = ({ defaultValue, onBlur }) => {
  return (
    <Input
      className="bg-transparent outline-none text-lg leading-6 font-medium text-gray-900 dark:text-white"
      defaultValue={defaultValue}
      onBlur={(event) => onBlur(event.target.value)}
    />
  )
}
