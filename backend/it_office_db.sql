-- phpMyAdmin SQL Dump
-- IT Office DB — updated schema with reservations and tech4ed

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- Database: `it_office_db`

-- --------------------------------------------------------
-- Table structure for table `borrowed_items`
-- --------------------------------------------------------

CREATE TABLE `borrowed_items` (
  `id` int(11) NOT NULL,
  `borrower_name` varchar(255) NOT NULL,
  `contact_number` varchar(255) DEFAULT NULL,
  `office` varchar(255) NOT NULL,
  `item_borrowed` varchar(255) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `released_by` varchar(255) NOT NULL,
  `date_borrowed` date NOT NULL,
  `returned_by` varchar(255) DEFAULT NULL,
  `received_by` varchar(255) DEFAULT NULL,
  `return_date` date DEFAULT NULL,
  `comments` text DEFAULT NULL,
  `status` enum('Pending','Returned') NOT NULL DEFAULT 'Pending',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table structure for table `employees`
-- --------------------------------------------------------

CREATE TABLE `employees` (
  `id` int(11) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `employees` (`id`, `full_name`, `is_active`) VALUES
(1, 'Juan dela Cruz', 1),
(2, 'Maria Santos', 1),
(3, 'Jose Reyes', 1),
(4, 'Ana Garcia', 1),
(5, 'Pedro Bautista', 1);

-- --------------------------------------------------------
-- Table structure for table `offices`
-- --------------------------------------------------------

CREATE TABLE `offices` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `offices` (`id`, `name`) VALUES
(2, 'Administrative Division'),
(3, 'Finance Division'),
(4, 'Human Resource Division'),
(5, 'IT Division'),
(8, 'Legal Division'),
(1, 'Office of the Director'),
(6, 'Planning Division'),
(7, 'Records Division');

-- --------------------------------------------------------
-- Table structure for table `repairs`
-- --------------------------------------------------------

CREATE TABLE `repairs` (
  `id` int(11) NOT NULL,
  `customer_name` varchar(255) NOT NULL,
  `contact_number` varchar(255) DEFAULT NULL,
  `office` varchar(255) NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `serial_specs` varchar(255) DEFAULT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `date_received` date NOT NULL,
  `received_by` varchar(255) NOT NULL,
  `problem_description` text NOT NULL,
  `repaired_by` varchar(255) DEFAULT NULL,
  `repair_comment` text DEFAULT NULL,
  `claimed_by` varchar(255) DEFAULT NULL,
  `date_claimed` date DEFAULT NULL,
  `released_by` varchar(255) DEFAULT NULL,
  `status` enum('Pending','Fixed','Unserviceable','Released') NOT NULL DEFAULT 'Pending',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table structure for table `reservations`
-- --------------------------------------------------------

CREATE TABLE `reservations` (
  `id` int(11) NOT NULL,
  `borrower_name` varchar(255) NOT NULL,
  `contact_number` varchar(255) DEFAULT NULL,
  `office` varchar(255) NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `reservation_date` date NOT NULL,
  `expected_return_date` date NOT NULL,
  `released_by` varchar(255) NOT NULL,
  `returned_by` varchar(255) DEFAULT NULL,
  `received_by` varchar(255) DEFAULT NULL,
  `actual_return_date` date DEFAULT NULL,
  `comments` text DEFAULT NULL,
  `status` enum('Active','Overdue','Returned') NOT NULL DEFAULT 'Active',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table structure for table `tech4ed`
-- --------------------------------------------------------

CREATE TABLE `tech4ed` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `gender` enum('Male','Female','Other') NOT NULL,
  `purpose` varchar(500) NOT NULL,
  `time_in` datetime NOT NULL,
  `time_out` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table structure for table `users`
-- --------------------------------------------------------

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Default admin user (password: admin123)
INSERT INTO `users` (`id`, `username`, `password`) VALUES
(1, 'admin', '$2b$10$8pNa69iSgfdL8vMU9kRc7.mOU0UQJwAeEHs.eMW8FfrAbEs0o5Js.');

-- --------------------------------------------------------
-- Indexes
-- --------------------------------------------------------

ALTER TABLE `borrowed_items` ADD PRIMARY KEY (`id`);
ALTER TABLE `employees`      ADD PRIMARY KEY (`id`), ADD UNIQUE KEY `full_name` (`full_name`);
ALTER TABLE `offices`        ADD PRIMARY KEY (`id`), ADD UNIQUE KEY `name` (`name`);
ALTER TABLE `repairs`        ADD PRIMARY KEY (`id`);
ALTER TABLE `reservations`   ADD PRIMARY KEY (`id`);
ALTER TABLE `tech4ed`        ADD PRIMARY KEY (`id`);
ALTER TABLE `users`          ADD PRIMARY KEY (`id`), ADD UNIQUE KEY `username` (`username`);

-- --------------------------------------------------------
-- AUTO_INCREMENT
-- --------------------------------------------------------

ALTER TABLE `borrowed_items` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
ALTER TABLE `employees`      MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;
ALTER TABLE `offices`        MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;
ALTER TABLE `repairs`        MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
ALTER TABLE `reservations`   MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;
ALTER TABLE `tech4ed`        MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;
ALTER TABLE `users`          MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

-- ── To add tables to an existing database (without dropping), run only: ──────
-- CREATE TABLE IF NOT EXISTS `reservations` ( ... ) ...
-- CREATE TABLE IF NOT EXISTS `tech4ed` ( ... ) ...
-- See above for full CREATE TABLE statements.
