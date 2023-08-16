import { Input } from "@chakra-ui/react";
import React, { LegacyRef, forwardRef } from "react";

interface ColumnTitleInputProps {
  defaultValue: string
  onBlur: (value: string) => void
}

export const ColumnTitleInput = forwardRef(({ defaultValue, onBlur }: ColumnTitleInputProps, ref) => {
  return (
    <Input
      id='column-title-input'
      ref={ref as LegacyRef<HTMLInputElement>}
      className='bg-transparent outline-none text-lg leading-6 font-medium text-gray-900 dark:text-white'
      defaultValue={defaultValue}
      onBlur={(event) => onBlur(event.target.value)}
    />
  )
});
