declare class AvailabilitySlotDto {
    weekday: number;
    startMinute: number;
    endMinute: number;
    preferredMinutes: number;
}
export declare class UpsertAvailabilityDto {
    timezone: string;
    slots: AvailabilitySlotDto[];
}
export {};
